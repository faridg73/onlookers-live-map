GRANT USAGE ON SCHEMA private TO authenticated;
REVOKE EXECUTE ON FUNCTION private.claim_bounty_atomic(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.claim_bounty_atomic(uuid, uuid) TO authenticated;