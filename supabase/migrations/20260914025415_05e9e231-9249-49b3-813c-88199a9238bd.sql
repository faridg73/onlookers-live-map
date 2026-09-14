GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

DROP TRIGGER IF EXISTS guard_profile_updates_trigger ON public.profiles;