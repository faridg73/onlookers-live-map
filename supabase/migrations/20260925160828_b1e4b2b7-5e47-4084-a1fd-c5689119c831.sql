-- Verified Visits: treat accounts without a paid plan as a 2-visit free trial.
CREATE OR REPLACE FUNCTION public.enforce_pro_visit_limit()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  IF NOT FOUND THEN
    RETURN NEW;
  END IF;

  v_limit := CASE v_plan
    WHEN 'starter' THEN 5
    WHEN 'pro' THEN 20
    WHEN 'team' THEN NULL
    ELSE 2 -- free trial
  END;

  IF v_limit IS NOT NULL AND v_used >= v_limit THEN
    IF v_plan IN ('starter','pro') THEN
      RAISE EXCEPTION 'Your % plan includes % verified visits this month. Upgrade your plan or wait for your next billing month.', initcap(v_plan), v_limit
        USING ERRCODE = 'P0001';
    ELSE
      RAISE EXCEPTION 'You have used both free trial verified visits. Choose a Verified Visits plan to keep scheduling.'
        USING ERRCODE = 'P0001';
    END IF;
  END IF;

  UPDATE public.pro_accounts
  SET visits_used = visits_used + 1,
      visit_period_start = v_period_start
  WHERE user_id = NEW.requester_id;

  RETURN NEW;
END;
$function$;