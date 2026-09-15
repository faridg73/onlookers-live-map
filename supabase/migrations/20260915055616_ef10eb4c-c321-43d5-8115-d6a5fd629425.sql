REVOKE ALL ON FUNCTION public.sync_follower_count() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_new_follower() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_follower_count() TO service_role;
GRANT EXECUTE ON FUNCTION public.notify_new_follower() TO service_role;