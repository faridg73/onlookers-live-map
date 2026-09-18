GRANT INSERT ON public.community_report_votes TO authenticated;

CREATE POLICY "Members can cast an eligible report vote"
ON public.community_report_votes FOR INSERT TO authenticated
WITH CHECK (
  voter_id = auth.uid()
  AND EXISTS (
    SELECT 1 FROM public.community_posts p
    WHERE p.id = post_id
      AND p.report_incident_type IS NOT NULL
      AND p.user_id <> auth.uid()
      AND (p.expires_at IS NULL OR p.expires_at > now())
  )
  AND (vote = 'flag' OR (vote = 'validate' AND public.trust_level(auth.uid()) >= 2))
);

CREATE OR REPLACE FUNCTION public.prepare_community_report_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.voter_id := auth.uid();
  IF NEW.voter_id IS NULL THEN RAISE EXCEPTION 'Sign in to respond to this report.'; END IF;
  NEW.voter_trust_level := public.trust_level(NEW.voter_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.prepare_community_report_vote() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prepare_community_report_vote() TO service_role;

CREATE TRIGGER prepare_community_report_vote_fields
BEFORE INSERT ON public.community_report_votes
FOR EACH ROW EXECUTE FUNCTION public.prepare_community_report_vote();

CREATE OR REPLACE FUNCTION public.refresh_community_report_after_vote()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.calculate_community_report_state(NEW.post_id);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.refresh_community_report_after_vote() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refresh_community_report_after_vote() TO service_role;

CREATE TRIGGER refresh_community_report_vote_totals
AFTER INSERT ON public.community_report_votes
FOR EACH ROW EXECUTE FUNCTION public.refresh_community_report_after_vote();

CREATE OR REPLACE FUNCTION public.vote_on_community_report(_post_id uuid, _vote text)
RETURNS TABLE(validation_count integer, flag_count integer, trust_score integer, report_status text)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_user uuid := auth.uid();
BEGIN
  IF v_user IS NULL THEN RAISE EXCEPTION 'Sign in to respond to this report.'; END IF;
  IF _vote NOT IN ('validate','flag') THEN RAISE EXCEPTION 'Choose Validate or Flag.'; END IF;

  INSERT INTO public.community_report_votes(post_id, voter_id, vote, voter_trust_level)
  VALUES (_post_id, v_user, _vote, public.trust_level(v_user));

  RETURN QUERY
  SELECT p.validation_count, p.flag_count, p.trust_score,
         CASE WHEN p.expires_at IS NOT NULL AND p.expires_at <= now() THEN 'expired' ELSE p.report_status END
  FROM public.community_posts p WHERE p.id = _post_id;
END;
$$;
REVOKE ALL ON FUNCTION public.vote_on_community_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.vote_on_community_report(uuid, text) TO authenticated, service_role;