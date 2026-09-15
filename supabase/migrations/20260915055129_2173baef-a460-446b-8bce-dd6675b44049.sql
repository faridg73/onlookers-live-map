REVOKE EXECUTE ON FUNCTION public.sync_follower_count() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_follower_count() TO service_role;