CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated;

CREATE OR REPLACE FUNCTION private.is_assigned_hunter(_request_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.claims
    WHERE request_id = _request_id
      AND spotter_id = _user_id
  );
$$;

REVOKE ALL ON FUNCTION private.is_assigned_hunter(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_assigned_hunter(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Claimed Hunters can view their assigned requests" ON public.requests;
CREATE POLICY "Claimed Hunters can view their assigned requests"
ON public.requests
FOR SELECT
TO authenticated
USING (private.is_assigned_hunter(id, auth.uid()));

DROP FUNCTION IF EXISTS public.is_assigned_hunter(uuid, uuid);