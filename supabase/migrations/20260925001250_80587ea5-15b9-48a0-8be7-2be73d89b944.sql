-- Review window for a submitted bounty, visible to the two participants and review staff.
CREATE OR REPLACE FUNCTION public.bounty_review_window(_request_id uuid)
RETURNS TABLE(status text, auto_release_at timestamptz, can_dispute boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT e.status,
         e.auto_release_at,
         (e.status = 'submitted'
          AND e.requester_id = auth.uid()
          AND (e.auto_release_at IS NULL OR e.auto_release_at > now())) AS can_dispute
  FROM public.escrows e
  WHERE e.request_id = _request_id
    AND (e.requester_id = auth.uid()
         OR e.spotter_id = auth.uid()
         OR public.is_review_staff(auth.uid()))
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.bounty_review_window(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.bounty_review_window(uuid) TO authenticated, service_role;

-- How often a poster reports the work they receive.
CREATE OR REPLACE FUNCTION public.poster_dispute_stats(_user_id uuid DEFAULT NULL)
RETURNS TABLE(reviewed_count integer, disputed_count integer, dispute_rate numeric)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE target uuid := COALESCE(_user_id, auth.uid());
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF target <> auth.uid() AND NOT public.is_review_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  RETURN QUERY
  WITH scope AS (
    SELECT e.disputed_at
    FROM public.escrows e
    WHERE e.requester_id = target
      AND (e.status IN ('submitted', 'released', 'disputed') OR e.disputed_at IS NOT NULL)
  )
  SELECT count(*)::int,
         count(*) FILTER (WHERE disputed_at IS NOT NULL)::int,
         CASE WHEN count(*) = 0 THEN 0::numeric
              ELSE ROUND(100.0 * count(*) FILTER (WHERE disputed_at IS NOT NULL) / count(*), 1)
         END
  FROM scope;
END;
$$;

REVOKE ALL ON FUNCTION public.poster_dispute_stats(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.poster_dispute_stats(uuid) TO authenticated, service_role;