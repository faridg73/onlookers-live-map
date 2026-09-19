CREATE OR REPLACE FUNCTION public.guard_emergency_report_tier()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.tags && ARRAY['incident:fire','incident:police','incident:medical']::text[]
     AND public.trust_level(NEW.user_id) < 3 THEN
    RAISE EXCEPTION 'Only verified creators and first responders can file emergency reports';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.guard_emergency_report_tier() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_emergency_report_tier() TO service_role;