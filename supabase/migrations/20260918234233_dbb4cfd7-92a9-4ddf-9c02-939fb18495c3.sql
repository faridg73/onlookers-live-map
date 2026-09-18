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

  v_score := v_initial + v_validations - v_flags;
  v_status := CASE
    WHEN v_expires IS NOT NULL AND v_expires <= now() THEN 'expired'
    WHEN v_flags >= 2 AND v_flags >= v_validations THEN 'disputed'
    WHEN v_validations >= 2 AND v_score >= 4 THEN 'confirmed'
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
    NEW.trust_score := NEW.reporter_trust_level;
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

UPDATE public.community_posts
SET trust_score = COALESCE(reporter_trust_level, 1) + validation_count - flag_count
WHERE report_incident_type IS NOT NULL;