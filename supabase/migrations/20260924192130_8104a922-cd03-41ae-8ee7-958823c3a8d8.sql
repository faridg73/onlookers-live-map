CREATE OR REPLACE FUNCTION public.verify_request_site_pin(_request_id uuid, _pin text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v public.request_site_pins;
  v_attempts integer;
  v_expires timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Sign in to verify an on-site PIN.';
  END IF;
  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This bounty does not use on-site PIN verification.';
  END IF;
  IF v.requester_id = auth.uid() THEN
    RAISE EXCEPTION 'The poster cannot verify their own bounty.';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = _request_id AND c.spotter_id = auth.uid()
      AND c.status IN ('in_progress', 'submitted')
  ) THEN
    RAISE EXCEPTION 'You need to claim this bounty before verifying the PIN. Tap "Claim" on the bounty first, then enter the PIN when you''re on site.';
  END IF;
  IF v.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object('verified', true, 'verified_at', v.verified_at, 'verified_by_me', v.verified_by = auth.uid());
  END IF;
  IF v.declined_at IS NOT NULL THEN
    RAISE EXCEPTION 'The property contact said this visit was not authorized. This PIN no longer works.';
  END IF;
  SELECT COALESCE(v.expires_at, r.expires_at + interval '2 hours') INTO v_expires FROM public.requests r WHERE r.id = _request_id;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN
    RAISE EXCEPTION 'This on-site PIN expired. Ask the poster to resend a fresh one.';
  END IF;
  v_attempts := v.attempts;
  IF v.last_attempt_at IS NULL OR v.last_attempt_at <= now() - interval '15 minutes' THEN
    v_attempts := 0;
  ELSIF v_attempts >= 5 THEN
    RAISE EXCEPTION 'Too many incorrect PIN attempts. Ask the on-site agent and try again in 15 minutes.';
  END IF;
  IF btrim(_pin) <> v.pin THEN
    UPDATE public.request_site_pins SET attempts = v_attempts + 1, last_attempt_at = now() WHERE request_id = _request_id;
    RETURN jsonb_build_object('verified', false, 'attempts_left', greatest(0, 5 - (v_attempts + 1)));
  END IF;
  UPDATE public.request_site_pins SET verified_at = now(), verified_by = auth.uid(), attempts = 0, last_attempt_at = now() WHERE request_id = _request_id;
  RETURN jsonb_build_object('verified', true, 'verified_at', now(), 'verified_by_me', true);
END;
$function$;

CREATE OR REPLACE FUNCTION public.site_checkin(_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
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
  RETURN jsonb_build_object('ok', true, 'checked_in_at', now());
END $$;