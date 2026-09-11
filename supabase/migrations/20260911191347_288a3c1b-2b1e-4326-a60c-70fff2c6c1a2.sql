
REVOKE EXECUTE ON FUNCTION public.request_is_live(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.close_expired_requests() FROM authenticated;
