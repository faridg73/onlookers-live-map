REVOKE ALL ON FUNCTION public.close_expired_requests() FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.grant_admin_for_verified_email() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.validate_bounty_boost() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.validate_bounty_video() FROM anon, authenticated, PUBLIC;
REVOKE ALL ON FUNCTION public.request_is_live(uuid) FROM anon, authenticated;
REVOKE ALL ON FUNCTION public.request_cashout(numeric) FROM anon;