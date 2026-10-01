REVOKE EXECUTE ON FUNCTION public.is_private_request(text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.force_private_replay() FROM PUBLIC, anon, authenticated;