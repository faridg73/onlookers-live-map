CREATE TABLE public.reputation_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action text NOT NULL,
  subject text NOT NULL DEFAULT '',
  points integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, action, subject)
);

GRANT SELECT ON public.reputation_events TO authenticated;
GRANT ALL ON public.reputation_events TO service_role;
ALTER TABLE public.reputation_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their own reputation" ON public.reputation_events
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TABLE public.trust_grants (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_responder boolean NOT NULL DEFAULT false,
  ambassador_region text NOT NULL DEFAULT '',
  seeded_points integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trust_grants TO authenticated;
GRANT ALL ON public.trust_grants TO service_role;
ALTER TABLE public.trust_grants ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members read their own trust grant" ON public.trust_grants
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins manage trust grants" ON public.trust_grants
  FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_trust_grants_updated_at BEFORE UPDATE ON public.trust_grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.reputation_total(_user_id uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((SELECT SUM(points) FROM public.reputation_events WHERE user_id = _user_id), 0)::int
       + COALESCE((SELECT seeded_points FROM public.trust_grants WHERE user_id = _user_id), 0);
$$;

CREATE OR REPLACE FUNCTION public.trust_level(_user_id uuid)
RETURNS integer LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_verified boolean := false;
  v_phone timestamptz;
  v_responder boolean := false;
BEGIN
  IF _user_id IS NULL THEN RETURN 1; END IF;
  SELECT is_verified, phone_verified_at INTO v_verified, v_phone
  FROM public.profiles WHERE id = _user_id;
  SELECT first_responder INTO v_responder FROM public.trust_grants WHERE user_id = _user_id;
  IF COALESCE(v_verified, false) OR COALESCE(v_responder, false) THEN RETURN 3; END IF;
  IF v_phone IS NOT NULL OR public.reputation_total(_user_id) >= 25 THEN RETURN 2; END IF;
  RETURN 1;
END;
$$;

CREATE OR REPLACE FUNCTION public.award_reputation(_action text, _subject text DEFAULT '')
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_user uuid := auth.uid();
  v_points integer;
  v_today integer;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  v_points := CASE _action
    WHEN 'flag_outdated' THEN 2
    WHEN 'validate_marker' THEN 3
    WHEN 'safety_tutorial' THEN 10
    ELSE NULL END;
  IF v_points IS NULL THEN RAISE EXCEPTION 'Unknown reputation action'; END IF;

  SELECT COUNT(*) INTO v_today FROM public.reputation_events
  WHERE user_id = v_user AND created_at > now() - interval '24 hours';
  IF v_today >= 20 THEN RETURN public.reputation_total(v_user); END IF;

  INSERT INTO public.reputation_events (user_id, action, subject, points)
  VALUES (v_user, _action, COALESCE(left(_subject, 120), ''), v_points)
  ON CONFLICT (user_id, action, subject) DO NOTHING;

  RETURN public.reputation_total(v_user);
END;
$$;

CREATE OR REPLACE FUNCTION public.seed_ambassador(_user_id uuid, _region text, _points integer DEFAULT 50, _first_responder boolean DEFAULT true)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  INSERT INTO public.trust_grants (user_id, first_responder, ambassador_region, seeded_points)
  VALUES (_user_id, _first_responder, COALESCE(_region, ''), GREATEST(COALESCE(_points, 0), 0))
  ON CONFLICT (user_id) DO UPDATE
    SET first_responder = EXCLUDED.first_responder,
        ambassador_region = EXCLUDED.ambassador_region,
        seeded_points = EXCLUDED.seeded_points,
        updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION public.guard_emergency_report_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tags && ARRAY['incident:fire','incident:police','incident:medical','incident:hazard']::text[]
     AND public.trust_level(NEW.user_id) < 3 THEN
    RAISE EXCEPTION 'Only verified creators and first responders can file emergency reports';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER guard_emergency_report_tier BEFORE INSERT ON public.community_posts
  FOR EACH ROW EXECUTE FUNCTION public.guard_emergency_report_tier();

REVOKE ALL ON FUNCTION public.reputation_total(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.trust_level(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.award_reputation(text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.seed_ambassador(uuid, text, integer, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_emergency_report_tier() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reputation_total(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.trust_level(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.award_reputation(text, text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.seed_ambassador(uuid, text, integer, boolean) TO service_role;
GRANT EXECUTE ON FUNCTION public.guard_emergency_report_tier() TO service_role;