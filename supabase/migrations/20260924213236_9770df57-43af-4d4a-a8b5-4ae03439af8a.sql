CREATE OR REPLACE FUNCTION private.claim_bounty_atomic(_request_id uuid, _spotter_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _request public.requests;
  _claim_id uuid;
BEGIN
  IF auth.uid() IS NULL OR _spotter_id IS DISTINCT FROM auth.uid() THEN
    RAISE EXCEPTION 'Sign in again before claiming this bounty.';
  END IF;

  SELECT * INTO _request
  FROM public.requests
  WHERE id = _request_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'This bounty no longer exists.';
  END IF;
  IF _request.requester_id = _spotter_id THEN
    RAISE EXCEPTION 'You cannot claim your own bounty. Sign in with your Hunter account.';
  END IF;
  IF _request.status <> 'open' OR _request.expires_at <= now() THEN
    RAISE EXCEPTION 'This bounty is no longer available. Refresh to see its current status.';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.claims
    WHERE request_id = _request_id
      AND status IN ('in_progress', 'submitted', 'approved')
  ) THEN
    RAISE EXCEPTION 'Another Hunter has already claimed this bounty.';
  END IF;

  INSERT INTO public.claims (request_id, spotter_id, status)
  VALUES (_request_id, _spotter_id, 'in_progress')
  RETURNING id INTO _claim_id;
  RETURN _claim_id;
END;
$$;