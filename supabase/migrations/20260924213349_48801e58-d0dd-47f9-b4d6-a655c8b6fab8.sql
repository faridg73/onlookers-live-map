CREATE OR REPLACE FUNCTION private.claim_bounty_entry(_request_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT private.claim_bounty_atomic(_request_id, auth.uid());
$$;
REVOKE ALL ON FUNCTION private.claim_bounty_entry(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.claim_bounty_entry(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.claim_bounty(_request_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.claim_bounty_entry(_request_id);
$$;
REVOKE ALL ON FUNCTION public.claim_bounty(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.claim_bounty(uuid) TO authenticated;