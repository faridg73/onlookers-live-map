ALTER TABLE public.community_posts
  ADD COLUMN IF NOT EXISTS report_incident_type text,
  ADD COLUMN IF NOT EXISTS report_radius_m integer,
  ADD COLUMN IF NOT EXISTS media_analysis_status text NOT NULL DEFAULT 'not_required',
  ADD COLUMN IF NOT EXISTS reporter_trust_level integer,
  ADD COLUMN IF NOT EXISTS validation_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS flag_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS trust_score integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS report_status text;

ALTER TABLE public.community_posts
  ADD CONSTRAINT community_posts_report_incident_type_check
    CHECK (report_incident_type IS NULL OR report_incident_type IN ('fire','police','medical','traffic','hazard')),
  ADD CONSTRAINT community_posts_report_radius_check
    CHECK (report_radius_m IS NULL OR report_radius_m BETWEEN 100 AND 2000),
  ADD CONSTRAINT community_posts_media_analysis_status_check
    CHECK (media_analysis_status IN ('not_required','analyzing','complete')),
  ADD CONSTRAINT community_posts_reporter_trust_level_check
    CHECK (reporter_trust_level IS NULL OR reporter_trust_level BETWEEN 1 AND 3),
  ADD CONSTRAINT community_posts_report_counts_check
    CHECK (validation_count >= 0 AND flag_count >= 0),
  ADD CONSTRAINT community_posts_report_status_check
    CHECK (report_status IS NULL OR report_status IN ('confirmed','disputed','unverified','expired'));

CREATE TABLE public.community_report_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
  voter_id uuid NOT NULL,
  vote text NOT NULL CHECK (vote IN ('validate','flag')),
  voter_trust_level integer NOT NULL CHECK (voter_trust_level BETWEEN 1 AND 3),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (post_id, voter_id)
);
GRANT SELECT ON public.community_report_votes TO authenticated;
GRANT ALL ON public.community_report_votes TO service_role;
ALTER TABLE public.community_report_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Members can view their own report vote"
  ON public.community_report_votes FOR SELECT TO authenticated
  USING (voter_id = auth.uid());

CREATE OR REPLACE FUNCTION public.calculate_community_report_state(_post_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_initial integer;
  v_validations integer;
  v_flags integer;
  v_score integer;
  v_expires timestamptz;
  v_status text;
BEGIN
  SELECT COALESCE(reporter_trust_level, 1), expires_at
    INTO v_initial, v_expires
  FROM public.community_posts
  WHERE id = _post_id AND report_incident_type IS NOT NULL
  FOR UPDATE;
  IF NOT FOUND THEN RETURN; END IF;

  SELECT count(*) FILTER (WHERE vote = 'validate'), count(*) FILTER (WHERE vote = 'flag')
    INTO v_validations, v_flags
  FROM public.community_report_votes
  WHERE post_id = _post_id;

  v_score := CASE v_initial WHEN 3 THEN 5 WHEN 2 THEN 2 ELSE 0 END
             + (v_validations * 2) - (v_flags * 3);
  v_status := CASE
    WHEN v_expires IS NOT NULL AND v_expires <= now() THEN 'expired'
    WHEN v_flags >= 2 AND v_flags >= v_validations THEN 'disputed'
    WHEN v_validations >= 2 AND v_score >= 6 THEN 'confirmed'
    ELSE 'unverified'
  END;

  UPDATE public.community_posts
  SET validation_count = v_validations,
      flag_count = v_flags,
      trust_score = v_score,
      report_status = v_status,
      updated_at = now()
  WHERE id = _post_id;
END;
$$;
REVOKE ALL ON FUNCTION public.calculate_community_report_state(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.calculate_community_report_state(uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.prepare_community_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.report_incident_type IS NULL THEN
    NEW.report_radius_m := NULL;
    NEW.media_analysis_status := 'not_required';
    NEW.reporter_trust_level := NULL;
    NEW.validation_count := 0;
    NEW.flag_count := 0;
    NEW.trust_score := 0;
    NEW.report_status := NULL;
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.reporter_trust_level := public.trust_level(NEW.user_id);
    NEW.validation_count := 0;
    NEW.flag_count := 0;
    NEW.trust_score := CASE NEW.reporter_trust_level WHEN 3 THEN 5 WHEN 2 THEN 2 ELSE 0 END;
    NEW.report_status := CASE WHEN NEW.expires_at IS NOT NULL AND NEW.expires_at <= now() THEN 'expired' ELSE 'unverified' END;
    IF NEW.media_path IS NULL THEN NEW.media_analysis_status := 'not_required'; END IF;
  ELSE
    IF auth.role() <> 'service_role' THEN
      NEW.reporter_trust_level := OLD.reporter_trust_level;
      NEW.validation_count := OLD.validation_count;
      NEW.flag_count := OLD.flag_count;
      NEW.trust_score := OLD.trust_score;
      NEW.report_status := OLD.report_status;
      NEW.media_analysis_status := OLD.media_analysis_status;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_community_report() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_community_report() TO service_role;

CREATE TRIGGER prepare_community_report_fields
BEFORE INSERT OR UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.prepare_community_report();

CREATE OR REPLACE FUNCTION public.vote_on_community_report(_post_id uuid, _vote text)
RETURNS TABLE(validation_count integer, flag_count integer, trust_score integer, report_status text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_level integer;
  v_owner uuid;
  v_expires timestamptz;
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to respond to this report.'; END IF;
  IF _vote NOT IN ('validate','flag') THEN RAISE EXCEPTION 'Choose Validate or Flag.'; END IF;

  SELECT user_id, expires_at INTO v_owner, v_expires
  FROM public.community_posts
  WHERE id = _post_id AND report_incident_type IS NOT NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'This report is unavailable.'; END IF;
  IF v_owner = v_user THEN RAISE EXCEPTION 'You cannot vote on your own report.'; END IF;
  IF v_expires IS NOT NULL AND v_expires <= now() THEN RAISE EXCEPTION 'This report has expired.'; END IF;

  v_level := public.trust_level(v_user);
  IF _vote = 'validate' AND v_level < 2 THEN
    RAISE EXCEPTION 'Validation requires a Level 2 or Level 3 account.';
  END IF;

  INSERT INTO public.community_report_votes(post_id, voter_id, vote, voter_trust_level)
  VALUES (_post_id, v_user, _vote, v_level);
  PERFORM public.calculate_community_report_state(_post_id);

  RETURN QUERY
  SELECT p.validation_count, p.flag_count, p.trust_score,
         CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= now() THEN 'expired' ELSE p.report_status END
  FROM public.community_posts p WHERE p.id = _post_id;
END;
$$;
REVOKE ALL ON FUNCTION public.vote_on_community_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_on_community_report(uuid, text) TO authenticated, service_role;

DROP FUNCTION public.public_community_feed(text, integer);
CREATE FUNCTION public.public_community_feed(_category text DEFAULT NULL::text, _limit integer DEFAULT 120)
RETURNS TABLE(
  id uuid, category text, tags text[], title text, body text, place text,
  latitude double precision, longitude double precision, media_path text, aspect text,
  is_flash boolean, expires_at timestamptz, pinned_until timestamptz, pinned_credits integer,
  created_at timestamptz, author_name text, hunter_level integer, author_verified boolean,
  report_incident_type text, report_radius_m integer, media_analysis_status text,
  reporter_trust_level integer, validation_count integer, flag_count integer,
  trust_score integer, report_status text
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, p.category, p.tags, p.title, p.body, p.place,
         round(p.latitude::numeric, 2)::double precision,
         round(p.longitude::numeric, 2)::double precision,
         p.media_path, p.aspect, p.is_flash, p.expires_at, p.pinned_until,
         p.pinned_credits, p.created_at,
         COALESCE(NULLIF(CASE WHEN pr.is_incognito THEN pr.alias ELSE pr.display_name END, ''), 'Onlooker'),
         COALESCE(pr.hunter_level, 1), COALESCE(pr.is_verified, false),
         p.report_incident_type, p.report_radius_m, p.media_analysis_status,
         p.reporter_trust_level, p.validation_count, p.flag_count, p.trust_score,
         CASE WHEN p.report_incident_type IS NOT NULL AND p.expires_at IS NOT NULL AND p.expires_at <= now()
              THEN 'expired' ELSE p.report_status END
  FROM public.community_posts p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  WHERE (p.expires_at IS NULL OR p.expires_at > now())
    AND (_category IS NULL OR p.category = _category)
  ORDER BY (p.pinned_until IS NOT NULL AND p.pinned_until > now()) DESC, p.created_at DESC
  LIMIT LEAST(COALESCE(_limit, 120), 200);
$$;
REVOKE ALL ON FUNCTION public.public_community_feed(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_community_feed(text, integer) TO anon, authenticated, service_role;