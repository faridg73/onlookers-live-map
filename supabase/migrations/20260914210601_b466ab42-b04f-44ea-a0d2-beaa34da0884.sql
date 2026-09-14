ALTER TABLE public.stream_sessions
  ADD COLUMN IF NOT EXISTS request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'pay_per_minute';

CREATE INDEX IF NOT EXISTS stream_sessions_request_id_idx ON public.stream_sessions(request_id);

CREATE POLICY "Bounty parties can read their bounty stream sessions"
ON public.stream_sessions
FOR SELECT
TO authenticated
USING (
  request_id IS NOT NULL
  AND (
    host_id = auth.uid()
    OR viewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = stream_sessions.request_id AND r.requester_id = auth.uid()
    )
  )
);

CREATE OR REPLACE FUNCTION public.accept_bounty_and_go_live(_request_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _req public.requests;
  _existing uuid;
  _session uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;

  SELECT * INTO _req FROM public.requests WHERE id = _request_id;
  IF _req.id IS NULL THEN RAISE EXCEPTION 'That bounty no longer exists.'; END IF;
  IF _req.requester_id = _uid THEN RAISE EXCEPTION 'You cannot accept your own bounty.'; END IF;
  IF _req.status <> 'open' THEN RAISE EXCEPTION 'That bounty is no longer open.'; END IF;
  IF _req.expires_at <= now() THEN RAISE EXCEPTION 'That bounty has expired.'; END IF;

  SELECT id INTO _existing FROM public.claims
  WHERE request_id = _request_id AND status <> 'approved'
  LIMIT 1;
  IF _existing IS NOT NULL THEN
    RAISE EXCEPTION 'Another broadcaster already accepted this bounty.';
  END IF;

  -- Recording the claim reserves the escrowed reward for this broadcaster.
  PERFORM set_config('app.trusted_write', 'on', true);
  INSERT INTO public.claims (request_id, spotter_id, status)
  VALUES (_request_id, _uid, 'in_progress');

  -- Live session bound to the funded bounty; payout comes from escrow, so the
  -- per-minute meter never runs on it.
  INSERT INTO public.stream_sessions
    (host_id, viewer_id, post_id, request_id, kind, credits_per_minute)
  VALUES (_uid, _req.requester_id, NULL, _request_id, 'bounty_escrow', 0)
  RETURNING id INTO _session;

  RETURN _session;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_bounty_and_go_live(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.accept_bounty_and_go_live(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.accept_bounty_and_go_live(uuid) TO service_role;