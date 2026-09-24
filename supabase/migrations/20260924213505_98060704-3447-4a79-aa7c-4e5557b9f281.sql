GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.claim_bounty_atomic(uuid, uuid) TO authenticated;