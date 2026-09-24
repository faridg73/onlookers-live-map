CREATE OR REPLACE FUNCTION public.enforce_pro_visit_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_plan text;
  v_period_start timestamptz;
  v_limit integer;
  v_used integer;
BEGIN
  IF NEW.category IS DISTINCT FROM 'realestate' THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended(NEW.requester_id::text || ':pro-visits', 0));

  SELECT plan, COALESCE(plan_updated_at, created_at)
    INTO v_plan, v_period_start
  FROM public.pro_accounts
  WHERE user_id = NEW.requester_id;

  IF NOT FOUND OR v_plan = 'none' OR v_plan = 'team' THEN
    RETURN NEW;
  END IF;

  v_limit := CASE v_plan WHEN 'starter' THEN 5 WHEN 'pro' THEN 20 ELSE NULL END;
  IF v_limit IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT count(*)::integer INTO v_used
  FROM public.requests
  WHERE requester_id = NEW.requester_id
    AND category = 'realestate'
    AND created_at >= v_period_start;

  IF v_used >= v_limit THEN
    RAISE EXCEPTION 'Your % plan includes % verified visits this month. Upgrade your plan or wait for your next billing month.', initcap(v_plan), v_limit
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_pro_visit_limit_before_insert ON public.requests;
CREATE TRIGGER enforce_pro_visit_limit_before_insert
BEFORE INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.enforce_pro_visit_limit();

CREATE OR REPLACE FUNCTION public.get_my_pro_visit_usage()
RETURNS TABLE(plan text, visits_used integer, visit_limit integer, period_start timestamptz)
LANGUAGE sql
STABLE
SECURITY DEFINER
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
REVOKE ALL ON FUNCTION public.enforce_pro_visit_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_pro_visit_limit() TO service_role;