REVOKE EXECUTE ON FUNCTION private.is_assigned_hunter(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_assigned_hunter(uuid, uuid) TO authenticated;