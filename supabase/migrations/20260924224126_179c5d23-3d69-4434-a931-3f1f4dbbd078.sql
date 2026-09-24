CREATE OR REPLACE FUNCTION public.site_checkin(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
DECLARE v public.request_site_pins; tok text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This bounty does not use on-site verification.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.claims c WHERE c.request_id = _request_id
     AND c.spotter_id = auth.uid() AND c.status IN ('in_progress','submitted')) THEN
    RAISE EXCEPTION 'You need to claim this bounty before checking in. Tap "Claim" on the bounty first.';
  END IF;
  IF v.verified_at IS NOT NULL THEN RAISE EXCEPTION 'This visit is already verified.'; END IF;
  IF v.declined_at IS NOT NULL THEN RAISE EXCEPTION 'The property contact cancelled this visit.'; END IF;
  IF v.approval_denied_for = auth.uid() THEN
    RAISE EXCEPTION 'The property contact did not approve you for this visit. It is with our review team.';
  END IF;
  IF v.checked_in_at IS NOT NULL AND v.checked_in_at > now() - interval '2 minutes' AND v.checked_in_by = auth.uid() THEN
    RAISE EXCEPTION 'Approval request already sent. Please wait a couple of minutes before sending again.';
  END IF;
  tok := replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '');
  UPDATE public.request_site_pins SET approve_token = tok, checked_in_at = now(), checked_in_by = auth.uid()
  WHERE request_id = _request_id;
  -- Keep the bounty reserved while the visit is in progress: the property
  -- contact has 60 minutes on the approval link, plus time to film and submit.
  UPDATE public.escrows
  SET reserved_until = now() + interval '2 hours', updated_at = now()
  WHERE request_id = _request_id AND status = 'reserved';
  RETURN jsonb_build_object('ok', true, 'checked_in_at', now());
END
$fn$;