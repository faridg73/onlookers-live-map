-- Remove anonymous access to precise coordinates and requester identity
DROP POLICY IF EXISTS "Anyone can view active requests" ON public.requests;

CREATE POLICY "Signed-in users can view active requests"
ON public.requests
FOR SELECT
TO authenticated
USING (status = 'open'::request_status AND expires_at > now());

REVOKE SELECT ON public.requests FROM anon;

-- Masked public feed: approximate location only, no requester identity
CREATE OR REPLACE FUNCTION public.public_request_markers()
RETURNS TABLE (
  id uuid,
  approx_latitude double precision,
  approx_longitude double precision,
  location_name text,
  bounty_amount numeric,
  category text,
  expires_at timestamptz,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id,
    round(r.latitude::numeric, 2)::double precision,
    round(r.longitude::numeric, 2)::double precision,
    r.location_name,
    r.bounty_amount,
    r.category,
    r.expires_at,
    r.created_at
  FROM public.requests r
  WHERE r.status = 'open'::request_status
    AND r.expires_at > now();
$$;

GRANT EXECUTE ON FUNCTION public.public_request_markers() TO anon, authenticated;