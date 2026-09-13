ALTER TABLE public.escrows
ADD COLUMN reason_code text
CHECK (reason_code IS NULL OR reason_code IN (
  'gps_mismatch',
  'timestamp_implausible',
  'duplicate_content',
  'individual_targeting_confirmed',
  'private_conversation_captured',
  'private_property_trespass',
  'minor_in_frame',
  'active_emergency_danger',
  'other_policy_violation'
));

CREATE OR REPLACE FUNCTION public.dispute_bounty(_request_id uuid, _reason text, _reason_code text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE e RECORD;
BEGIN
  IF _reason_code NOT IN (
    'gps_mismatch', 'timestamp_implausible', 'duplicate_content',
    'individual_targeting_confirmed', 'private_conversation_captured',
    'private_property_trespass', 'minor_in_frame', 'active_emergency_danger',
    'other_policy_violation'
  ) THEN RAISE EXCEPTION 'Choose a valid moderation reason'; END IF;

  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nothing to dispute'; END IF;
  IF e.requester_id <> auth.uid() THEN RAISE EXCEPTION 'Only the person who posted this request can dispute it'; END IF;
  IF e.status <> 'submitted' THEN RAISE EXCEPTION 'The review window for this bounty has closed'; END IF;
  IF e.auto_release_at IS NOT NULL AND e.auto_release_at <= now() THEN
    RAISE EXCEPTION 'The review window for this bounty has closed';
  END IF;

  UPDATE public.escrows
  SET status = 'disputed', auto_release_at = NULL,
      dispute_reason = COALESCE(_reason, ''), reason_code = _reason_code,
      disputed_at = now(), updated_at = now()
  WHERE id = e.id;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION public.dispute_bounty(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispute_bounty(uuid, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.list_disputes_with_reasons()
RETURNS TABLE(
  request_id uuid,
  prompt text,
  location_name text,
  amount numeric,
  status text,
  dispute_reason text,
  reason_code text,
  disputed_at timestamptz,
  requester_id uuid,
  spotter_id uuid,
  is_moderator boolean,
  evidence_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.request_id, r.prompt, r.location_name, e.amount, e.status,
         COALESCE(e.dispute_reason, ''), e.reason_code, e.disputed_at,
         e.requester_id, e.spotter_id, public.is_review_staff(auth.uid()),
         (SELECT count(*)::int FROM public.dispute_evidence d WHERE d.request_id = e.request_id)
  FROM public.escrows e
  JOIN public.requests r ON r.id = e.request_id
  WHERE e.status = 'disputed'
    AND (public.is_review_staff(auth.uid())
         OR e.requester_id = auth.uid()
         OR e.spotter_id = auth.uid())
  ORDER BY e.disputed_at DESC NULLS LAST;
$$;
REVOKE ALL ON FUNCTION public.list_disputes_with_reasons() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_disputes_with_reasons() TO authenticated;