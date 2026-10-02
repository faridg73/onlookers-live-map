CREATE OR REPLACE FUNCTION public.pay_per_minute_enabled() RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
CREATE OR REPLACE FUNCTION public.bidding_enabled() RETURNS boolean LANGUAGE sql IMMUTABLE AS $$ SELECT false $$;
GRANT EXECUTE ON FUNCTION public.pay_per_minute_enabled() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.bidding_enabled() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.bill_stream_minute(_session_id uuid)
 RETURNS TABLE(minutes_billed integer, credits_spent integer, host_earned integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _row public.stream_sessions; _rate integer; _fee integer; _net integer;
BEGIN
  IF NOT public.pay_per_minute_enabled() THEN RAISE EXCEPTION 'Pay-per-minute filming is currently paused'; END IF;
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  SELECT * INTO _row FROM public.stream_sessions WHERE id = _session_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'That live session no longer exists.'; END IF;
  IF _row.viewer_id <> _uid THEN RAISE EXCEPTION 'Only the viewer can be charged for this session.'; END IF;
  IF _row.status <> 'live' THEN RAISE EXCEPTION 'This live session has ended.'; END IF;
  _rate := _row.credits_per_minute;
  _fee := ROUND(_rate * public.platform_fee_rate());
  _net := _rate - _fee;
  PERFORM public.adjust_wallet(_uid, -_rate, 'stream_minute', NULL, format('%s Credits for a minute of live video', _rate));
  PERFORM public.adjust_wallet(_row.host_id, _net, 'stream_earning', NULL, format('%s Credits earned streaming live', _net));
  INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
  VALUES (NULL, _row.host_id, _rate, _fee);
  UPDATE public.stream_sessions AS session
  SET minutes_billed = session.minutes_billed + 1,
      credits_spent = session.credits_spent + _rate,
      credits_earned = session.credits_earned + _net
  WHERE session.id = _session_id
  RETURNING session.minutes_billed, session.credits_spent, session.credits_earned
  INTO minutes_billed, credits_spent, host_earned;
  RETURN NEXT;
END; $function$;

CREATE OR REPLACE FUNCTION public.place_bounty_bid(_request_id uuid, _amount integer, _note text DEFAULT ''::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _req record; _existing record; _id uuid;
BEGIN
  IF NOT public.bidding_enabled() THEN RAISE EXCEPTION 'Bidding is currently paused. Claim open bounties directly.'; END IF;
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
END; $function$;

CREATE OR REPLACE FUNCTION public.start_stream_session(_host_id uuid, _credits_per_minute integer DEFAULT 4, _post_id uuid DEFAULT NULL::uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF NOT public.pay_per_minute_enabled() THEN RAISE EXCEPTION 'Pay-per-minute filming is currently paused'; END IF;
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF _host_id = _uid THEN RAISE EXCEPTION 'You cannot pay to watch your own stream.'; END IF;
  IF _credits_per_minute IS NULL OR _credits_per_minute < 1 THEN
    RAISE EXCEPTION 'A live session costs at least 1 Credit per minute.';
  END IF;
  INSERT INTO public.stream_sessions (host_id, viewer_id, post_id, credits_per_minute)
  VALUES (_host_id, _uid, _post_id, _credits_per_minute)
  RETURNING id INTO _id;
  RETURN _id;
END;
$function$;