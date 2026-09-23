CREATE TABLE public.dispute_resolutions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  resolver_id uuid NOT NULL,
  requester_id uuid NOT NULL,
  spotter_id uuid,
  outcome text NOT NULL,
  spotter_pct numeric NOT NULL DEFAULT 0,
  amount numeric NOT NULL DEFAULT 0,
  note text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.dispute_resolutions TO authenticated;
GRANT ALL ON public.dispute_resolutions TO service_role;

ALTER TABLE public.dispute_resolutions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Review staff read every resolution"
ON public.dispute_resolutions FOR SELECT TO authenticated
USING (public.is_review_staff(auth.uid()));

CREATE POLICY "Parties read their own resolutions"
ON public.dispute_resolutions FOR SELECT TO authenticated
USING (auth.uid() = requester_id OR auth.uid() = spotter_id);

CREATE INDEX dispute_resolutions_requester_idx ON public.dispute_resolutions (requester_id, created_at DESC);
CREATE INDEX dispute_resolutions_spotter_idx ON public.dispute_resolutions (spotter_id, created_at DESC);

CREATE TRIGGER update_dispute_resolutions_updated_at
BEFORE UPDATE ON public.dispute_resolutions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.resolve_dispute(_request_id uuid, _award_spotter boolean, _note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE e RECORD; fee numeric; net numeric; clean_note text;
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;

  clean_note := btrim(COALESCE(_note, ''));
  IF length(clean_note) < 10 THEN
    RAISE EXCEPTION 'Write at least a short reason (10 characters) for this decision';
  END IF;

  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id AND status = 'disputed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No open dispute for this request'; END IF;

  IF _award_spotter THEN
    fee := ROUND(e.amount * 0.15, 2);
    net := e.amount - fee;
    IF net > 0 THEN
      PERFORM public.adjust_wallet(e.spotter_id, net, 'bounty_payout', e.request_id, 'Bounty earned (dispute settled)');
    END IF;
    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (e.request_id, e.spotter_id, e.amount, fee);
    UPDATE public.escrows SET status = 'released', updated_at = now() WHERE id = e.id;
    UPDATE public.claims SET status = 'approved' WHERE request_id = e.request_id AND status <> 'approved';
    UPDATE public.requests SET status = 'completed' WHERE id = e.request_id;
  ELSE
    IF e.amount > 0 THEN
      PERFORM public.adjust_wallet(e.requester_id, e.amount, 'escrow_refund', e.request_id, 'Dispute settled - bounty refunded');
    END IF;
    UPDATE public.escrows SET status = 'refunded', updated_at = now() WHERE id = e.id;
    UPDATE public.requests SET status = 'expired' WHERE id = _request_id AND status <> 'completed';
  END IF;

  INSERT INTO public.dispute_resolutions
    (request_id, resolver_id, requester_id, spotter_id, outcome, spotter_pct, amount, note)
  VALUES (e.request_id, auth.uid(), e.requester_id, e.spotter_id,
          CASE WHEN _award_spotter THEN 'payout' ELSE 'refund' END,
          CASE WHEN _award_spotter THEN 100 ELSE 0 END, e.amount, clean_note);

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.resolve_dispute_split(_request_id uuid, _spotter_pct numeric, _note text DEFAULT '')
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE e RECORD; share numeric; refund numeric; fee numeric; net numeric; clean_note text;
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF _spotter_pct IS NULL OR _spotter_pct <= 0 OR _spotter_pct >= 100 THEN
    RAISE EXCEPTION 'The onlooker share must be between 1 and 99 percent';
  END IF;

  clean_note := btrim(COALESCE(_note, ''));
  IF length(clean_note) < 10 THEN
    RAISE EXCEPTION 'Write at least a short reason (10 characters) for this decision';
  END IF;

  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id AND status = 'disputed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No open dispute for this request'; END IF;

  share := ROUND(e.amount * (_spotter_pct / 100.0), 2);
  refund := e.amount - share;
  fee := ROUND(share * 0.15, 2);
  net := share - fee;

  IF net > 0 AND e.spotter_id IS NOT NULL THEN
    PERFORM public.adjust_wallet(e.spotter_id, net, 'bounty_payout', e.request_id,
      'Kill fee (dispute settled partially)');
    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (e.request_id, e.spotter_id, share, fee);
  END IF;

  IF refund > 0 THEN
    PERFORM public.adjust_wallet(e.requester_id, refund, 'escrow_refund', e.request_id,
      'Dispute settled - partial refund');
  END IF;

  UPDATE public.escrows SET status = 'released', updated_at = now() WHERE id = e.id;
  UPDATE public.claims SET status = 'approved' WHERE request_id = e.request_id AND status <> 'approved';
  UPDATE public.requests SET status = 'completed' WHERE id = e.request_id;

  INSERT INTO public.dispute_resolutions
    (request_id, resolver_id, requester_id, spotter_id, outcome, spotter_pct, amount, note)
  VALUES (e.request_id, auth.uid(), e.requester_id, e.spotter_id, 'split', _spotter_pct, e.amount, clean_note);

  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_dispute(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, boolean, text) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.resolve_dispute_split(uuid, numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resolve_dispute_split(uuid, numeric, text) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.dispute_history_for(_requester_id uuid, _spotter_id uuid)
RETURNS TABLE (
  id uuid,
  request_id uuid,
  prompt text,
  outcome text,
  spotter_pct numeric,
  amount numeric,
  note text,
  side text,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT d.id, d.request_id, r.prompt, d.outcome, d.spotter_pct, d.amount, d.note,
         CASE
           WHEN d.requester_id = _requester_id AND d.spotter_id IS NOT DISTINCT FROM _spotter_id THEN 'both'
           WHEN d.requester_id = _requester_id THEN 'poster'
           ELSE 'onlooker'
         END AS side,
         d.created_at
  FROM public.dispute_resolutions d
  JOIN public.requests r ON r.id = d.request_id
  WHERE public.is_review_staff(auth.uid())
    AND (d.requester_id = _requester_id
         OR (_spotter_id IS NOT NULL AND d.spotter_id = _spotter_id))
  ORDER BY d.created_at DESC
  LIMIT 20;
$function$;

REVOKE ALL ON FUNCTION public.dispute_history_for(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispute_history_for(uuid, uuid) TO authenticated, service_role;