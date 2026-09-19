CREATE OR REPLACE FUNCTION public.list_eligible_dispute_bounties()
RETURNS TABLE(
  request_id uuid,
  prompt text,
  location_name text,
  amount numeric,
  submitted_at timestamptz,
  review_ends_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT e.request_id, r.prompt, r.location_name, e.amount, e.updated_at, e.auto_release_at
  FROM public.escrows e
  JOIN public.requests r ON r.id = e.request_id
  WHERE auth.uid() IS NOT NULL
    AND e.requester_id = auth.uid()
    AND e.status = 'submitted'
    AND (e.auto_release_at IS NULL OR e.auto_release_at > now())
  ORDER BY e.updated_at DESC;
$$;
REVOKE ALL ON FUNCTION public.list_eligible_dispute_bounties() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_eligible_dispute_bounties() TO authenticated;

DROP FUNCTION public.open_dispute_with_evidence(uuid,text,text,text,text,text,integer);

CREATE FUNCTION public.open_dispute_with_evidence(
  _user_id uuid,
  _request_id uuid,
  _reason_code text,
  _description text,
  _storage_path text DEFAULT NULL,
  _file_name text DEFAULT NULL,
  _file_type text DEFAULT NULL,
  _file_size integer DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  e public.escrows%ROWTYPE;
  clean_description text := btrim(COALESCE(_description, ''));
  clean_name text := btrim(COALESCE(_file_name, ''));
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'A verified member is required'; END IF;
  IF _reason_code NOT IN ('failure_to_deliver','quality_issue','verification_mismatch') THEN
    RAISE EXCEPTION 'Choose a valid dispute reason';
  END IF;
  IF char_length(clean_description) < 10 OR char_length(clean_description) > 3000 THEN
    RAISE EXCEPTION 'Description must be between 10 and 3000 characters';
  END IF;
  IF NOT public.consume_rate_limit('dispute_create', _user_id::text, 5, 3600) THEN
    RAISE EXCEPTION 'Too many dispute attempts. Try again later.';
  END IF;

  IF _storage_path IS NOT NULL THEN
    IF split_part(_storage_path, '/', 1) <> _user_id::text
       OR split_part(_storage_path, '/', 2) <> _request_id::text
       OR _storage_path LIKE '%..%'
       OR _file_size IS NULL OR _file_size < 1 OR _file_size > 20971520
       OR _file_type NOT IN ('image/jpeg','image/png','image/webp','video/mp4','video/quicktime','video/webm','application/pdf')
       OR char_length(clean_name) < 1 OR char_length(clean_name) > 180 THEN
      RAISE EXCEPTION 'Invalid evidence attachment';
    END IF;
  ELSIF _file_name IS NOT NULL OR _file_type IS NOT NULL OR _file_size IS NOT NULL THEN
    RAISE EXCEPTION 'Incomplete evidence attachment';
  END IF;

  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nothing to dispute'; END IF;
  IF e.requester_id <> _user_id THEN RAISE EXCEPTION 'Only the person who posted this bounty can dispute it'; END IF;
  IF e.status <> 'submitted' THEN RAISE EXCEPTION 'This bounty is not eligible for a new dispute'; END IF;
  IF e.auto_release_at IS NOT NULL AND e.auto_release_at <= now() THEN
    RAISE EXCEPTION 'The review window for this bounty has closed';
  END IF;

  UPDATE public.escrows
  SET status = 'disputed', auto_release_at = NULL,
      dispute_reason = clean_description, reason_code = _reason_code,
      disputed_at = now(), updated_at = now()
  WHERE id = e.id;

  INSERT INTO public.dispute_evidence (
    request_id, author_id, role, body, storage_path, file_name, file_type, file_size
  ) VALUES (
    _request_id, _user_id, 'poster', clean_description,
    _storage_path, NULLIF(clean_name, ''), _file_type, _file_size
  );
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.open_dispute_with_evidence(uuid,uuid,text,text,text,text,text,integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.open_dispute_with_evidence(uuid,uuid,text,text,text,text,text,integer) TO service_role;