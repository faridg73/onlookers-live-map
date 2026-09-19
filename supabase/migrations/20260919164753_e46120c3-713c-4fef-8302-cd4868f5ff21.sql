CREATE TABLE public.request_site_pins (
  request_id uuid PRIMARY KEY REFERENCES public.requests(id) ON DELETE CASCADE,
  requester_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pin text NOT NULL CHECK (pin ~ '^[0-9]{6}$'),
  verified_at timestamp with time zone,
  verified_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  attempts integer NOT NULL DEFAULT 0,
  last_attempt_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.request_site_pins TO authenticated;
GRANT ALL ON public.request_site_pins TO service_role;

ALTER TABLE public.request_site_pins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Poster reads their own site pin"
ON public.request_site_pins
FOR SELECT
TO authenticated
USING (requester_id = auth.uid());

CREATE TRIGGER update_request_site_pins_updated_at
BEFORE UPDATE ON public.request_site_pins
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Status helper: tells the app whether a PIN is required and if it is verified.
CREATE OR REPLACE FUNCTION public.request_site_pin_state(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v public.request_site_pins;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('required', false);
  END IF;

  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('required', false);
  END IF;

  RETURN jsonb_build_object(
    'required', true,
    'mine', v.requester_id = auth.uid(),
    'pin', CASE WHEN v.requester_id = auth.uid() THEN v.pin ELSE NULL END,
    'verified', v.verified_at IS NOT NULL,
    'verified_at', v.verified_at,
    'verified_by_me', v.verified_by = auth.uid()
  );
END;
$$;

-- Validation: match the 6-digit PIN, then record the on-site verification.
CREATE OR REPLACE FUNCTION public.verify_request_site_pin(_request_id uuid, _pin text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v public.request_site_pins;
  v_attempts integer;
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

REVOKE ALL ON FUNCTION public.request_site_pin_state(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.verify_request_site_pin(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_site_pin_state(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_request_site_pin(uuid, text) TO authenticated;

-- Payout gate: no footage submission on a PIN bounty without an on-site match.
CREATE OR REPLACE FUNCTION public.enforce_site_pin_on_bounty_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_request uuid;
  v public.request_site_pins;
BEGIN
  BEGIN
    v_request := NEW.request_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  SELECT * INTO v FROM public.request_site_pins WHERE request_id = v_request;
  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  IF v.verified_at IS NULL OR v.verified_by IS DISTINCT FROM NEW.uploader_id THEN
    RAISE EXCEPTION 'Enter the 6-digit on-site PIN from the agent before submitting footage for this bounty.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_site_pin_on_bounty_video() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER enforce_site_pin_before_bounty_video
BEFORE INSERT ON public.bounty_videos
FOR EACH ROW EXECUTE FUNCTION public.enforce_site_pin_on_bounty_video();