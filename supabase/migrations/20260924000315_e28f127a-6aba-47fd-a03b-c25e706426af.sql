CREATE TABLE public.bounty_bids (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  bidder_id uuid NOT NULL,
  amount integer NOT NULL CHECK (amount > 0),
  note text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX bounty_bids_one_active ON public.bounty_bids (request_id, bidder_id) WHERE status = 'active';
CREATE INDEX bounty_bids_request_idx ON public.bounty_bids (request_id, amount DESC);
CREATE INDEX bounty_bids_bidder_idx ON public.bounty_bids (bidder_id, created_at DESC);

GRANT SELECT ON public.bounty_bids TO authenticated;
GRANT ALL ON public.bounty_bids TO service_role;
ALTER TABLE public.bounty_bids ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Bidders see their own bids" ON public.bounty_bids FOR SELECT TO authenticated
  USING (bidder_id = auth.uid());
CREATE POLICY "Posters see bids on their bounties" ON public.bounty_bids FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.requests r WHERE r.id = request_id AND r.requester_id = auth.uid()));

CREATE TRIGGER bounty_bids_updated_at BEFORE UPDATE ON public.bounty_bids
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Public count + top bid (no identities)
CREATE OR REPLACE FUNCTION public.bounty_bid_summary(_request_id uuid)
RETURNS TABLE(bid_count integer, top_bid integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT count(*)::int, COALESCE(max(amount),0)::int FROM public.bounty_bids
  WHERE request_id = _request_id AND status = 'active';
$$;

-- Place or raise a bid: credits held from the wallet
CREATE OR REPLACE FUNCTION public.place_bounty_bid(_request_id uuid, _amount integer, _note text DEFAULT '')
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _req record; _existing record; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Please sign in to bid'; END IF;
  IF _amount IS NULL OR _amount < 1 OR _amount > 100000 THEN RAISE EXCEPTION 'Enter a bid between 1 and 100,000 credits'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND banned_at IS NOT NULL) THEN RAISE EXCEPTION 'This account is suspended'; END IF;
  SELECT id, requester_id, status, expires_at INTO _req FROM public.requests WHERE id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bounty not found'; END IF;
  IF _req.requester_id = _uid THEN RAISE EXCEPTION 'You cannot bid on your own bounty'; END IF;
  IF _req.status <> 'open' OR _req.expires_at <= now() THEN RAISE EXCEPTION 'This bounty is no longer taking bids'; END IF;

  SELECT * INTO _existing FROM public.bounty_bids WHERE request_id = _request_id AND bidder_id = _uid AND status = 'active' FOR UPDATE;
  IF FOUND THEN
    IF _amount = _existing.amount THEN RETURN _existing.id; END IF;
    PERFORM public.adjust_wallet(_uid, _existing.amount - _amount, 'bid_hold', _request_id,
      format('Bid changed to %s credits', _amount));
    UPDATE public.bounty_bids SET amount = _amount, note = left(COALESCE(_note,''),280) WHERE id = _existing.id;
    RETURN _existing.id;
  END IF;

  PERFORM public.adjust_wallet(_uid, -_amount, 'bid_hold', _request_id, format('Bid of %s credits held', _amount));
  INSERT INTO public.bounty_bids (request_id, bidder_id, amount, note)
  VALUES (_request_id, _uid, _amount, left(COALESCE(_note,''),280)) RETURNING id INTO _id;
  RETURN _id;
END; $$;

CREATE OR REPLACE FUNCTION public.withdraw_bounty_bid(_bid_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b record;
BEGIN
  SELECT * INTO _b FROM public.bounty_bids WHERE id = _bid_id AND bidder_id = auth.uid() AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found'; END IF;
  UPDATE public.bounty_bids SET status = 'withdrawn' WHERE id = _b.id;
  PERFORM public.adjust_wallet(_b.bidder_id, _b.amount, 'bid_refund', _b.request_id, 'Bid withdrawn — credits returned');
END; $$;

-- Let the award function create the winner's claim
CREATE OR REPLACE FUNCTION public.validate_claim_insert()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE target_request RECORD;
BEGIN
  SELECT requester_id, status, expires_at INTO target_request FROM public.requests WHERE id = NEW.request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Request not found'; END IF;
  IF auth.uid() IS NOT NULL AND NEW.spotter_id <> auth.uid()
     AND COALESCE(current_setting('app.bid_award', true), 'off') <> 'on' THEN
    RAISE EXCEPTION 'Spotters can only create their own claims';
  END IF;
  IF target_request.requester_id = NEW.spotter_id THEN RAISE EXCEPTION 'You cannot claim your own request'; END IF;
  IF target_request.status <> 'open' OR target_request.expires_at <= now() THEN RAISE EXCEPTION 'This request is no longer active'; END IF;
  RETURN NEW;
END;
$function$;

-- Poster confirms the winner
CREATE OR REPLACE FUNCTION public.award_bounty_bid(_bid_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b record; _req record; _fee integer; _net integer; _other record;
BEGIN
  SELECT * INTO _b FROM public.bounty_bids WHERE id = _bid_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found'; END IF;
  SELECT id, requester_id, status, expires_at INTO _req FROM public.requests WHERE id = _b.request_id FOR UPDATE;
  IF _req.requester_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the Poster can choose the winner'; END IF;
  IF _req.status <> 'open' OR _req.expires_at <= now() THEN RAISE EXCEPTION 'This bounty is no longer open'; END IF;

  UPDATE public.bounty_bids SET status = 'won' WHERE id = _b.id;
  _fee := floor(_b.amount * 0.2);
  _net := _b.amount - _fee;
  IF _net > 0 THEN
    PERFORM public.adjust_wallet(_req.requester_id, _net, 'bid_winning', _req.id,
      format('Winning bid of %s credits (after 20%% fee)', _b.amount));
  END IF;
  INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
  VALUES (_req.id, _b.bidder_id, _b.amount, _fee);

  FOR _other IN SELECT * FROM public.bounty_bids WHERE request_id = _req.id AND status = 'active' FOR UPDATE LOOP
    UPDATE public.bounty_bids SET status = 'refunded' WHERE id = _other.id;
    PERFORM public.adjust_wallet(_other.bidder_id, _other.amount, 'bid_refund', _req.id, 'Another Onlooker was chosen — credits returned');
  END LOOP;

  PERFORM set_config('app.bid_award', 'on', true);
  INSERT INTO public.claims (request_id, spotter_id) VALUES (_req.id, _b.bidder_id);
  PERFORM set_config('app.bid_award', 'off', true);
END; $$;

-- Refund active bids when a bounty closes without a winner
CREATE OR REPLACE FUNCTION public.refund_bids_on_request_close()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b record;
BEGIN
  IF NEW.status IN ('expired','completed','claimed') AND OLD.status = 'open' THEN
    FOR _b IN SELECT * FROM public.bounty_bids WHERE request_id = NEW.id AND status = 'active' FOR UPDATE LOOP
      UPDATE public.bounty_bids SET status = 'refunded' WHERE id = _b.id;
      PERFORM public.adjust_wallet(_b.bidder_id, _b.amount, 'bid_refund', NEW.id, 'Bounty closed — bid credits returned');
    END LOOP;
  END IF;
  RETURN NEW;
END; $$;
CREATE TRIGGER refund_bids_on_request_close AFTER UPDATE OF status ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.refund_bids_on_request_close();

CREATE OR REPLACE FUNCTION public.refund_bids_on_request_delete()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _b record;
BEGIN
  FOR _b IN SELECT * FROM public.bounty_bids WHERE request_id = OLD.id AND status = 'active' LOOP
    PERFORM public.adjust_wallet(_b.bidder_id, _b.amount, 'bid_refund', NULL, 'Bounty cancelled — bid credits returned');
  END LOOP;
  RETURN OLD;
END; $$;
CREATE TRIGGER refund_bids_on_request_delete BEFORE DELETE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.refund_bids_on_request_delete();

REVOKE ALL ON FUNCTION public.place_bounty_bid(uuid,integer,text), public.withdraw_bounty_bid(uuid), public.award_bounty_bid(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.place_bounty_bid(uuid,integer,text), public.withdraw_bounty_bid(uuid), public.award_bounty_bid(uuid) TO authenticated;
REVOKE ALL ON FUNCTION public.refund_bids_on_request_close(), public.refund_bids_on_request_delete() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.bounty_bid_summary(uuid) TO anon, authenticated;

-- Bidder name for the Poster's list
CREATE OR REPLACE FUNCTION public.bounty_bids_for_poster(_request_id uuid)
RETURNS TABLE(id uuid, bidder_id uuid, bidder_name text, amount integer, note text, status text, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT b.id, b.bidder_id, COALESCE(NULLIF(p.display_name,''), 'Onlooker'), b.amount, b.note, b.status, b.created_at
  FROM public.bounty_bids b
  JOIN public.requests r ON r.id = b.request_id AND r.requester_id = auth.uid()
  LEFT JOIN public.profiles p ON p.id = b.bidder_id
  WHERE b.request_id = _request_id
  ORDER BY (b.status = 'active') DESC, b.amount DESC, b.created_at;
$$;
REVOKE ALL ON FUNCTION public.bounty_bids_for_poster(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bounty_bids_for_poster(uuid) TO authenticated;