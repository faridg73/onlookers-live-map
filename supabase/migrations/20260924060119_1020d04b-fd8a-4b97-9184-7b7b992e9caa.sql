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

  -- PIN verification is bound to the claiming Onlooker: only the account that
  -- actually claimed this bounty can verify its PIN. A correct PIN typed by
  -- anyone else is rejected.
  IF NOT EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = _request_id
      AND c.spotter_id = auth.uid()
      AND c.status IN ('in_progress', 'submitted')
  ) THEN
    RAISE EXCEPTION 'Only the onlooker who claimed this bounty can verify its on-site PIN. Claim the bounty first.';
  END IF;

  IF v.verified_at IS NOT NULL THEN
    RETURN jsonb_build_object(
      'verified', true,
      'verified_at', v.verified_at,
      'verified_by_me', v.verified_by = auth.uid()
    );
  END IF;

  IF v.declined_at IS NOT NULL THEN
    RAISE EXCEPTION 'The property contact said this visit was not authorized. This PIN no longer works.';
  END IF;

  SELECT COALESCE(v.expires_at, r.expires_at + interval '2 hours')
    INTO v_expires FROM public.requests r WHERE r.id = _request_id;
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
    UPDATE public.request_site_pins
    SET attempts = v_attempts + 1, last_attempt_at = now()
    WHERE request_id = _request_id;
    RETURN jsonb_build_object('verified', false, 'attempts_left', greatest(0, 5 - (v_attempts + 1)));
  END IF;

  UPDATE public.request_site_pins
  SET verified_at = now(), verified_by = auth.uid(), attempts = 0, last_attempt_at = now()
  WHERE request_id = _request_id;

  RETURN jsonb_build_object('verified', true, 'verified_at', now(), 'verified_by_me', true);
END;
$function$