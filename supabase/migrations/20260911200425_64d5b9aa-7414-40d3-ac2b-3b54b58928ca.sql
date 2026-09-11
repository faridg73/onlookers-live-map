CREATE TABLE public.dispute_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.requests(id) ON DELETE CASCADE,
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'participant',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.dispute_evidence TO authenticated;
GRANT ALL ON public.dispute_evidence TO service_role;

ALTER TABLE public.dispute_evidence ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.can_view_dispute(_request_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.has_role(_user_id, 'admin') OR EXISTS (
    SELECT 1 FROM public.escrows e
    WHERE e.request_id = _request_id
      AND (e.requester_id = _user_id OR e.spotter_id = _user_id)
  ) OR EXISTS (
    SELECT 1 FROM public.bounty_videos v
    WHERE v.request_id::text = _request_id::text AND v.uploader_id = _user_id
  );
$$;

CREATE POLICY "Participants and moderators read dispute evidence"
ON public.dispute_evidence FOR SELECT TO authenticated
USING (public.can_view_dispute(request_id, auth.uid()));

CREATE POLICY "Participants and moderators add their own evidence"
ON public.dispute_evidence FOR INSERT TO authenticated
WITH CHECK (author_id = auth.uid() AND public.can_view_dispute(request_id, auth.uid()));

CREATE INDEX dispute_evidence_request_idx ON public.dispute_evidence (request_id, created_at);

CREATE TRIGGER update_dispute_evidence_updated_at
BEFORE UPDATE ON public.dispute_evidence
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.list_disputes()
RETURNS TABLE(
  request_id uuid,
  prompt text,
  location_name text,
  amount numeric,
  status text,
  dispute_reason text,
  disputed_at timestamptz,
  requester_id uuid,
  spotter_id uuid,
  is_moderator boolean,
  evidence_count integer
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT e.request_id, r.prompt, r.location_name, e.amount, e.status,
         COALESCE(e.dispute_reason, ''), e.disputed_at, e.requester_id, e.spotter_id,
         public.has_role(auth.uid(), 'admin'),
         (SELECT count(*)::int FROM public.dispute_evidence d WHERE d.request_id = e.request_id)
  FROM public.escrows e
  JOIN public.requests r ON r.id = e.request_id
  WHERE e.status = 'disputed'
    AND (public.has_role(auth.uid(), 'admin')
         OR e.requester_id = auth.uid()
         OR e.spotter_id = auth.uid())
  ORDER BY e.disputed_at DESC NULLS LAST;
$$;

REVOKE ALL ON FUNCTION public.list_disputes() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_disputes() TO authenticated;
REVOKE ALL ON FUNCTION public.can_view_dispute(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_view_dispute(uuid, uuid) TO authenticated;