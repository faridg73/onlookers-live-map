CREATE OR REPLACE FUNCTION public.get_my_pro_visit_usage()
RETURNS TABLE(plan text, visits_used integer, visit_limit integer, period_start timestamptz)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    p.plan,
    CASE WHEN p.plan = 'none' THEN 0 ELSE count(r.id)::integer END AS visits_used,
    CASE p.plan WHEN 'starter' THEN 5 WHEN 'pro' THEN 20 ELSE NULL END AS visit_limit,
    COALESCE(p.plan_updated_at, p.created_at) AS period_start
  FROM public.pro_accounts p
  LEFT JOIN public.requests r
    ON r.requester_id = p.user_id
   AND r.category = 'realestate'
   AND r.created_at >= COALESCE(p.plan_updated_at, p.created_at)
  WHERE p.user_id = auth.uid()
  GROUP BY p.plan, p.plan_updated_at, p.created_at;
$$;

REVOKE ALL ON FUNCTION public.get_my_pro_visit_usage() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_my_pro_visit_usage() TO authenticated, service_role;