CREATE OR REPLACE FUNCTION public.list_eligible_conditions_disputes()
 RETURNS TABLE(request_id uuid, prompt text, location_name text, amount numeric, declared_multiplier numeric, submitted_at timestamp with time zone, review_ends_at timestamp with time zone)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT e.request_id, r.prompt, r.location_name, e.amount,
         COALESCE(r.weather_multiplier, 1), e.updated_at, e.auto_release_at
  FROM public.escrows e
  JOIN public.requests r ON r.id = e.request_id
  WHERE auth.uid() IS NOT NULL
    AND e.spotter_id = auth.uid()
    AND e.status IN ('reserved', 'submitted')
    AND (e.auto_release_at IS NULL OR e.auto_release_at > now())
  ORDER BY e.updated_at DESC;
$function$;

CREATE OR REPLACE FUNCTION public.open_dispute_with_evidence(_user_id uuid, _request_id uuid, _reason_code text, _description text, _storage_path text DEFAULT NULL::text, _file_name text DEFAULT NULL::text, _file_type text DEFAULT NULL::text, _file_size integer DEFAULT NULL::integer)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  e public.escrows%ROWTYPE;
  clean_description text := btrim(COALESCE(_description, ''));
  clean_name text := btrim(COALESCE(_file_name, ''));
  is_conditions boolean := _reason_code = 'conditions_mismatch';
  filer_role text := 'poster';
BEGIN
  IF _user_id IS NULL THEN RAISE EXCEPTION 'A verified member is required'; END IF;
  IF _reason_code NOT IN ('failure_to_deliver','quality_issue','verification_mismatch','conditions_mismatch') THEN
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

  IF is_conditions THEN
    IF e.spotter_id IS NULL OR e.spotter_id <> _user_id THEN
      RAISE EXCEPTION 'Only the onlooker working this bounty can raise a conditions review';
    END IF;
    IF e.status NOT IN ('reserved','submitted') THEN
      RAISE EXCEPTION 'This bounty is not eligible for a conditions review';
    END IF;
    filer_role := 'spotter';
  ELSE
    IF e.requester_id <> _user_id THEN RAISE EXCEPTION 'Only the person who posted this bounty can dispute it'; END IF;
    IF e.status <> 'submitted' THEN RAISE EXCEPTION 'This bounty is not eligible for a new dispute'; END IF;
  END IF;

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
    _request_id, _user_id, filer_role, clean_description,
    _storage_path, NULLIF(clean_name, ''), _file_type, _file_size
  );
  RETURN true;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.list_eligible_conditions_disputes() TO authenticated;