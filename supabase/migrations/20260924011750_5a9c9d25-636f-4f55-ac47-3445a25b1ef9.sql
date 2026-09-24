ALTER TABLE public.pro_accounts
  ADD COLUMN visits_used integer NOT NULL DEFAULT 0 CHECK (visits_used >= 0),
  ADD COLUMN visit_period_start timestamptz;

UPDATE public.pro_accounts p
SET visit_period_start = COALESCE(p.plan_updated_at, p.created_at),
    visits_used = CASE
      WHEN p.plan = 'none' THEN 0
      ELSE (
        SELECT count(*)::integer
        FROM public.requests r
        WHERE r.requester_id = p.user_id
          AND r.category = 'realestate'
          AND r.created_at >= COALESCE(p.plan_updated_at, p.created_at)
      )
    END;

DROP FUNCTION IF EXISTS public.get_my_pro_visit_usage();

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

  SELECT plan, COALESCE(visit_period_start, plan_updated_at, created_at), visits_used
    INTO v_plan, v_period_start, v_used
  FROM public.pro_accounts
  WHERE user_id = NEW.requester_id
  FOR UPDATE;

  IF NOT FOUND OR v_plan = 'none' THEN
    RETURN NEW;
  END IF;

  v_limit := CASE v_plan WHEN 'starter' THEN 5 WHEN 'pro' THEN 20 ELSE NULL END;
  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    RAISE EXCEPTION 'Your % plan includes % verified visits this month. Upgrade your plan or wait for your next billing month.', initcap(v_plan), v_limit
      USING ERRCODE = 'P0001';
  END IF;

  UPDATE public.pro_accounts
  SET visits_used = visits_used + 1,
      visit_period_start = v_period_start
  WHERE user_id = NEW.requester_id;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_pro_visit_limit() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enforce_pro_visit_limit() TO service_role;