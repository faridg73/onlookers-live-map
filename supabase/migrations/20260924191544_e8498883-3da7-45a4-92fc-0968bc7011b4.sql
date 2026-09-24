ALTER TABLE public.request_site_pins
  ADD COLUMN IF NOT EXISTS approve_token text UNIQUE,
  ADD COLUMN IF NOT EXISTS checked_in_at timestamptz,
  ADD COLUMN IF NOT EXISTS checked_in_by uuid,
  ADD COLUMN IF NOT EXISTS approval_denied_at timestamptz,
  ADD COLUMN IF NOT EXISTS approval_denied_for uuid,
  ADD COLUMN IF NOT EXISTS approval_deny_note text,
  ADD COLUMN IF NOT EXISTS approved_via text;

-- Hunter taps "I'm on site": claimant-only, creates a fresh one-hour approval token.
CREATE OR REPLACE FUNCTION public.site_checkin(_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.request_site_pins; tok text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first.'; END IF;
  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This bounty does not use on-site verification.'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.claims c WHERE c.request_id = _request_id
     AND c.spotter_id = auth.uid() AND c.status IN ('in_progress','submitted')) THEN
    RAISE EXCEPTION 'Only the onlooker who claimed this bounty can check in. Claim it first.';
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

-- Live status for the Hunter / Poster screens (no secrets).
CREATE OR REPLACE FUNCTION public.site_approval_state(_request_id uuid)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.request_site_pins;
BEGIN
  IF auth.uid() IS NULL THEN RETURN '{}'::jsonb; END IF;
  SELECT * INTO v FROM public.request_site_pins WHERE request_id = _request_id;
  IF NOT FOUND THEN RETURN '{}'::jsonb; END IF;
  IF v.requester_id <> auth.uid() AND NOT EXISTS (SELECT 1 FROM public.claims c WHERE c.request_id = _request_id AND c.spotter_id = auth.uid()) THEN
    RETURN '{}'::jsonb;
  END IF;
  RETURN jsonb_build_object(
    'checked_in_at', v.checked_in_at,
    'checked_in_by_me', v.checked_in_by = auth.uid(),
    'link_active', v.approve_token IS NOT NULL AND v.checked_in_at > now() - interval '60 minutes',
    'verified', v.verified_at IS NOT NULL,
    'verified_at', v.verified_at,
    'approved_via', v.approved_via,
    'denied', v.approval_denied_at IS NOT NULL,
    'denied_for_me', v.approval_denied_for = auth.uid(),
    'denied_at', v.approval_denied_at,
    'declined', v.declined_at IS NOT NULL);
END $$;

-- Token lookup for the public approval page (service role only).
CREATE OR REPLACE FUNCTION public.site_approval_lookup(_token text)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.request_site_pins; p public.profiles; loc text;
BEGIN
  SELECT * INTO v FROM public.request_site_pins WHERE approve_token = btrim(_token);
  IF NOT FOUND THEN RAISE EXCEPTION 'This approval link is not valid.'; END IF;
  SELECT * INTO p FROM public.profiles WHERE id = v.checked_in_by;
  SELECT location_name INTO loc FROM public.requests WHERE id = v.request_id;
  RETURN jsonb_build_object(
    'location_name', COALESCE(loc, 'the property'),
    'hunter_name', COALESCE(NULLIF(p.display_name, ''), NULLIF(p.username, ''), 'Onlooker'),
    'hunter_avatar', p.avatar_url,
    'hunter_verified', COALESCE(p.is_verified, false),
    'hunter_rating', p.rating,
    'checked_in_at', v.checked_in_at,
    'expired', v.checked_in_at IS NULL OR v.checked_in_at <= now() - interval '60 minutes',
    'verified', v.verified_at IS NOT NULL,
    'denied', v.approval_denied_at IS NOT NULL AND v.approval_denied_for = v.checked_in_by,
    'declined', v.declined_at IS NOT NULL);
END $$;

-- Agent approves or denies the checked-in Hunter (service role only).
CREATE OR REPLACE FUNCTION public.site_approval_decide(_token text, _approve boolean, _note text DEFAULT '')
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v public.request_site_pins;
BEGIN
  SELECT * INTO v FROM public.request_site_pins WHERE approve_token = btrim(_token) FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This approval link is not valid.'; END IF;
  IF v.verified_at IS NOT NULL THEN RETURN jsonb_build_object('ok', true, 'already', 'approved'); END IF;
  IF v.declined_at IS NOT NULL THEN RAISE EXCEPTION 'This visit was already cancelled.'; END IF;
  IF v.approval_denied_for = v.checked_in_by THEN RETURN jsonb_build_object('ok', true, 'already', 'denied'); END IF;
  IF v.checked_in_at IS NULL OR v.checked_in_at <= now() - interval '60 minutes' THEN
    RAISE EXCEPTION 'This approval link expired. Ask the onlooker to check in again.';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.claims c WHERE c.request_id = v.request_id
     AND c.spotter_id = v.checked_in_by AND c.status IN ('in_progress','submitted')) THEN
    RAISE EXCEPTION 'This onlooker no longer holds this bounty.';
  END IF;
  IF _approve THEN
    UPDATE public.request_site_pins SET verified_at = now(), verified_by = v.checked_in_by,
      approved_via = 'link', approve_token = NULL WHERE request_id = v.request_id;
    RETURN jsonb_build_object('ok', true, 'result', 'approved');
  END IF;
  UPDATE public.request_site_pins SET approval_denied_at = now(), approval_denied_for = v.checked_in_by,
    approval_deny_note = NULLIF(left(btrim(COALESCE(_note,'')), 1000), ''), approve_token = NULL
  WHERE request_id = v.request_id;
  INSERT INTO public.moderation_flags (user_id, title, details, matched_terms, source)
  VALUES (v.checked_in_by, 'Property contact denied onlooker on site',
    'Request ' || v.request_id::text || ': ' || COALESCE(NULLIF(btrim(_note), ''), 'No note'),
    ARRAY['site_approval_denied'], 'site_approval');
  RETURN jsonb_build_object('ok', true, 'result', 'denied');
END $$;

-- PIN backup must also refuse a Hunter the contact denied.
CREATE OR REPLACE FUNCTION public.guard_denied_pin_hunter()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.verified_at IS NOT NULL AND OLD.verified_at IS NULL
     AND NEW.verified_by IS NOT NULL AND NEW.verified_by = OLD.approval_denied_for THEN
    RAISE EXCEPTION 'The property contact did not approve you for this visit. It is with our review team.';
  END IF;
  IF NEW.verified_at IS NOT NULL AND OLD.verified_at IS NULL AND NEW.approved_via IS NULL THEN
    NEW.approved_via := 'pin';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS guard_denied_pin_hunter ON public.request_site_pins;
CREATE TRIGGER guard_denied_pin_hunter BEFORE UPDATE ON public.request_site_pins
  FOR EACH ROW EXECUTE FUNCTION public.guard_denied_pin_hunter();

REVOKE ALL ON FUNCTION public.site_approval_lookup(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.site_approval_decide(text, boolean, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.site_approval_lookup(text) TO service_role;
GRANT EXECUTE ON FUNCTION public.site_approval_decide(text, boolean, text) TO service_role;
REVOKE ALL ON FUNCTION public.site_checkin(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.site_approval_state(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.site_checkin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.site_approval_state(uuid) TO authenticated;