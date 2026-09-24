CREATE OR REPLACE FUNCTION public.claim_bounty(_request_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT private.claim_bounty_atomic(_request_id, auth.uid());
$$;
GRANT EXECUTE ON FUNCTION private.claim_bounty_atomic(uuid, uuid) TO authenticated;
DROP FUNCTION IF EXISTS private.claim_bounty_entry(uuid);