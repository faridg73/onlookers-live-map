ALTER FUNCTION public.claim_bounty(uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.claim_bounty(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_bounty(uuid) TO authenticated;