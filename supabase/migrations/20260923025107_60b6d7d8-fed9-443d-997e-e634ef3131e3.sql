ALTER TABLE public.request_site_pins
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS agent_name text,
  ADD COLUMN IF NOT EXISTS agent_phone text,
  ADD COLUMN IF NOT EXISTS agent_email text,
  ADD COLUMN IF NOT EXISTS last_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS send_count integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS declined_at timestamptz,
  ADD COLUMN IF NOT EXISTS decline_note text,
  ADD COLUMN IF NOT EXISTS decline_token text;

CREATE UNIQUE INDEX IF NOT EXISTS request_site_pins_decline_token_idx
  ON public.request_site_pins (decline_token) WHERE decline_token IS NOT NULL;

UPDATE public.request_site_pins p
SET expires_at = COALESCE(p.expires_at, r.expires_at + interval '2 hours')
FROM public.requests r
WHERE r.id = p.request_id AND p.expires_at IS NULL;

-- Status helper: PIN requirement, expiry, decline and resend state.
CREATE OR REPLACE FUNCTION public.request_site_pin_state(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.request_site_pins;
  v_expires timestamptz;
  v_escrow public.escrows;
  v_mine boolean;
  v_is_spotter boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('required', false);
  END IF;

  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('required', false);
  END IF;

  SELECT COALESCE(v.expires_at, r.expires_at + interval '2 hours')
    INTO v_expires FROM public.requests r WHERE r.id = _request_id;

  SELECT * INTO v_escrow FROM public.escrows WHERE request_id = _request_id;

  v_mine := v.requester_id = auth.uid();
  v_is_spotter := v_escrow.spotter_id IS NOT NULL AND v_escrow.spotter_id = auth.uid();

  RETURN jsonb_build_object(
    'required', true,
    'mine', v_mine,
    'pin', CASE WHEN v_mine THEN v.pin ELSE NULL END,
    'verified', v.verified_at IS NOT NULL,
    'verified_at', v.verified_at,
    'verified_by_me', v.verified_by = auth.uid(),
    'expires_at', v_expires,
    'expired', v.verified_at IS NULL AND v_expires IS NOT NULL AND v_expires <= now(),
    'declined', v.declined_at IS NOT NULL,
    'declined_at', v.declined_at,
    'decline_note', v.decline_note,
    'send_count', v.send_count,
    'last_sent_at', v.last_sent_at,
    'agent_phone_set', COALESCE(btrim(v.agent_phone), '') <> '',
    'agent_email_set', COALESCE(btrim(v.agent_email), '') <> '',
    'can_resend', (v_mine OR v_is_spotter) AND v.verified_at IS NULL AND v.declined_at IS NULL,
    'is_spotter', v_is_spotter,
    'unreachable_eligible', v_is_spotter
      AND v.verified_at IS NULL
      AND v_escrow.status IN ('reserved','submitted')
      AND v_escrow.updated_at <= now() - interval '15 minutes'
  );
END;
$$;

-- Validation: single use, blocked once expired or declined.
CREATE OR REPLACE FUNCTION public.verify_request_site_pin(_request_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- Resend gate: poster or the assigned onlooker, throttled, never returns the PIN.
CREATE OR REPLACE FUNCTION public.authorize_site_pin_resend(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.request_site_pins;
  v_escrow public.escrows;
  v_expires timestamptz;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;

  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This bounty does not use on-site PIN verification.'; END IF;
  IF v.verified_at IS NOT NULL THEN RAISE EXCEPTION 'This bounty is already verified on site.'; END IF;
  IF v.declined_at IS NOT NULL THEN RAISE EXCEPTION 'The property contact declined this visit.'; END IF;

  SELECT * INTO v_escrow FROM public.escrows WHERE request_id = _request_id;
  IF v.requester_id <> auth.uid()
     AND NOT (v_escrow.spotter_id IS NOT NULL AND v_escrow.spotter_id = auth.uid()) THEN
    RAISE EXCEPTION 'Only the poster or the onlooker working this bounty can resend the PIN.';
  END IF;

  SELECT COALESCE(v.expires_at, r.expires_at + interval '2 hours')
    INTO v_expires FROM public.requests r WHERE r.id = _request_id;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN
    RAISE EXCEPTION 'This bounty has closed, so the PIN can no longer be resent.';
  END IF;

  IF v.last_sent_at IS NOT NULL AND v.last_sent_at > now() - interval '2 minutes' THEN
    RAISE EXCEPTION 'The PIN was just sent. Wait two minutes before resending.';
  END IF;
  IF v.send_count >= 10 THEN
    RAISE EXCEPTION 'The PIN has been sent too many times. Contact support.';
  END IF;

  UPDATE public.request_site_pins
  SET last_sent_at = now(), send_count = v.send_count + 1
  WHERE request_id = _request_id;

  RETURN jsonb_build_object('ok', true, 'send_count', v.send_count + 1);
END;
$$;

REVOKE ALL ON FUNCTION public.authorize_site_pin_resend(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.authorize_site_pin_resend(uuid) TO authenticated, service_role;

-- Onlooker on site but no PIN relayed: hold the money and send it to review.
CREATE OR REPLACE FUNCTION public.report_agent_unreachable(_request_id uuid, _description text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.escrows%ROWTYPE;
  v public.request_site_pins;
  clean_description text := btrim(COALESCE(_description, ''));
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  IF char_length(clean_description) < 10 OR char_length(clean_description) > 3000 THEN
    RAISE EXCEPTION 'Describe what happened on site (at least 10 characters).';
  END IF;
  IF NOT public.consume_rate_limit('dispute_create', auth.uid()::text, 5, 3600) THEN
    RAISE EXCEPTION 'Too many reports. Try again later.';
  END IF;

  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'This bounty does not use on-site PIN verification.'; END IF;
  IF v.verified_at IS NOT NULL THEN RAISE EXCEPTION 'This bounty is already verified on site.'; END IF;

  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nothing to report on this bounty.'; END IF;
  IF e.spotter_id IS NULL OR e.spotter_id <> auth.uid() THEN
    RAISE EXCEPTION 'Only the onlooker working this bounty can report the contact unreachable.';
  END IF;
  IF e.status NOT IN ('reserved','submitted') THEN
    RAISE EXCEPTION 'This bounty is not eligible for an unreachable-contact report.';
  END IF;
  IF e.updated_at > now() - interval '15 minutes' THEN
    RAISE EXCEPTION 'Give the property contact at least 15 minutes before reporting them unreachable.';
  END IF;

  UPDATE public.escrows
  SET status = 'disputed', auto_release_at = NULL,
      dispute_reason = clean_description, reason_code = 'agent_unreachable',
      disputed_at = now(), updated_at = now()
  WHERE id = e.id;

  INSERT INTO public.dispute_evidence (request_id, author_id, role, body)
  VALUES (_request_id, auth.uid(), 'spotter', clean_description);

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.report_agent_unreachable(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.report_agent_unreachable(uuid, text) TO authenticated, service_role;

-- Agent decline link: cancel, refund the poster, pay the onlooker a trip fee.
CREATE OR REPLACE FUNCTION public.decline_site_pin_authorization(_token text, _note text DEFAULT '')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.request_site_pins;
  e public.escrows%ROWTYPE;
  clean_note text := left(btrim(COALESCE(_note, '')), 1000);
  kill_fee numeric := 0;
  fee numeric := 0;
  net numeric := 0;
  refund numeric := 0;
BEGIN
  IF COALESCE(btrim(_token), '') = '' THEN RAISE EXCEPTION 'Invalid link.'; END IF;

  SELECT * INTO v FROM public.request_site_pins WHERE decline_token = btrim(_token) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This link is not valid.'; END IF;

  IF v.declined_at IS NOT NULL THEN
    RETURN jsonb_build_object('ok', true, 'already', true, 'request_id', v.request_id);
  END IF;
  IF v.verified_at IS NOT NULL THEN
    RAISE EXCEPTION 'This visit was already verified on site and can no longer be declined here.';
  END IF;

  UPDATE public.request_site_pins
  SET declined_at = now(), decline_note = NULLIF(clean_note, ''), expires_at = now()
  WHERE request_id = v.request_id;

  SELECT * INTO e FROM public.escrows WHERE request_id = v.request_id FOR UPDATE;
  IF FOUND AND e.status IN ('held','reserved','submitted') THEN
    IF e.spotter_id IS NOT NULL AND e.status IN ('reserved','submitted') THEN
      kill_fee := ROUND(e.amount * 0.25, 2);
      fee := ROUND(kill_fee * 0.15, 2);
      net := kill_fee - fee;
      IF net > 0 THEN
        PERFORM public.adjust_wallet(e.spotter_id, net, 'bounty_payout', e.request_id,
          'Trip fee - property visit was not authorized');
        INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
        VALUES (e.request_id, e.spotter_id, kill_fee, fee);
      END IF;
    END IF;

    refund := e.amount - kill_fee;
    IF refund > 0 THEN
      PERFORM public.adjust_wallet(e.requester_id, refund, 'escrow_refund', e.request_id,
        'Bounty cancelled - property contact did not authorize the visit');
    END IF;

    UPDATE public.escrows
    SET status = CASE WHEN kill_fee > 0 THEN 'released' ELSE 'refunded' END, updated_at = now()
    WHERE id = e.id;
  END IF;

  UPDATE public.requests SET status = 'expired', updated_at = now()
  WHERE id = v.request_id AND status <> 'completed';

  RETURN jsonb_build_object('ok', true, 'already', false, 'request_id', v.request_id,
                            'kill_fee', kill_fee, 'refund', refund);
END;
$$;

REVOKE ALL ON FUNCTION public.decline_site_pin_authorization(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decline_site_pin_authorization(text, text) TO service_role;