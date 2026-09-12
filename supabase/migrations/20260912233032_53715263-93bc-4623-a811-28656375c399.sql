CREATE OR REPLACE FUNCTION public.hunter_trust(_user_id uuid)
RETURNS TABLE(
  total_claims integer,
  completed_claims integer,
  completion_rate numeric,
  avg_response_minutes numeric,
  hunter_level integer,
  xp integer,
  verified boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH c AS (
    SELECT
      count(*)::int AS total,
      count(*) FILTER (WHERE status = 'approved')::int AS done,
      avg(EXTRACT(EPOCH FROM (updated_at - claimed_at)) / 60.0)
        FILTER (WHERE status IN ('submitted','approved')) AS resp
    FROM public.claims
    WHERE spotter_id = _user_id
  ), p AS (
    SELECT hunter_level, xp FROM public.profiles WHERE id = _user_id
  )
  SELECT
    c.total,
    c.done,
    CASE WHEN c.total > 0 THEN round((c.done::numeric / c.total) * 100, 0) ELSE 0 END,
    round(coalesce(c.resp, 0)::numeric, 1),
    coalesce(p.hunter_level, 1),
    coalesce(p.xp, 0),
    (c.done >= 3 AND (c.total = 0 OR (c.done::numeric / greatest(c.total,1)) >= 0.8))
  FROM c LEFT JOIN p ON true;
$$;

GRANT EXECUTE ON FUNCTION public.hunter_trust(uuid) TO authenticated, anon;