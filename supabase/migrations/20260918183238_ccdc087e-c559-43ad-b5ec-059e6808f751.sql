REVOKE ALL ON FUNCTION public.guard_cashout_velocity(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.consume_rate_limit(text, text, integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.guard_cashout_velocity(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.consume_rate_limit(text, text, integer, integer) TO service_role;