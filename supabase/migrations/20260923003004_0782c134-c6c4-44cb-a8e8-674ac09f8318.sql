
CREATE OR REPLACE FUNCTION public.list_disputes_detailed()
RETURNS TABLE(
  request_id uuid, prompt text, details text, checklist text[], category text,
  location_name text, location_type text, amount numeric, status text,
  dispute_reason text, reason_code text, disputed_at timestamp with time zone,
  requester_id uuid, spotter_id uuid, is_moderator boolean, evidence_count integer
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT e.request_id, r.prompt, COALESCE(r.details, ''), COALESCE(r.checklist, '{}'::text[]),
         r.category, r.location_name, r.location_type, e.amount, e.status,
         COALESCE(e.dispute_reason, ''), e.reason_code, e.disputed_at,
         e.requester_id, e.spotter_id, public.is_review_staff(auth.uid()),
         (SELECT count(*)::int FROM public.dispute_evidence d WHERE d.request_id = e.request_id)
  FROM public.escrows e
  JOIN public.requests r ON r.id = e.request_id
  WHERE e.status = 'disputed'
    AND (public.is_review_staff(auth.uid())
         OR e.requester_id = auth.uid()
         OR e.spotter_id = auth.uid())
  ORDER BY e.disputed_at DESC NULLS LAST;
$function$;

REVOKE ALL ON FUNCTION public.list_disputes_detailed() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_disputes_detailed() TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_disputes_detailed() TO service_role;

-- Partial settlement: kill fee to the onlooker, remainder refunded to the poster.
CREATE OR REPLACE FUNCTION public.resolve_dispute_split(_request_id uuid, _spotter_pct numeric)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE e RECORD; share numeric; refund numeric; fee numeric; net numeric;
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;
  IF _spotter_pct IS NULL OR _spotter_pct <= 0 OR _spotter_pct >= 100 THEN
    RAISE EXCEPTION 'The onlooker share must be between 1 and 99 percent';
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
  RETURN true;
END;
$function$;

REVOKE ALL ON FUNCTION public.resolve_dispute_split(uuid, numeric) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_dispute_split(uuid, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute_split(uuid, numeric) TO service_role;
