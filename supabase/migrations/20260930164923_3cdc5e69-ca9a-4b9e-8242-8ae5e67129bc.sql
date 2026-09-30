REVOKE ALL ON FUNCTION public.qa_simulate_bounty_payout(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_simulate_bounty_payout(uuid, integer) TO service_role;