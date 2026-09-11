-- Who may talk on a bounty thread: the requester, a claiming spotter, or a
-- reporter who uploaded a clip for it. Chat only exists once someone claimed
-- or submitted, which is exactly what "unlocks" the box.
CREATE OR REPLACE FUNCTION public.can_chat_on_request(_request_key text, _user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE rid uuid; unlocked boolean := false;
BEGIN
  IF _user_id IS NULL OR _request_key IS NULL THEN RETURN false; END IF;

  BEGIN rid := _request_key::uuid; EXCEPTION WHEN others THEN rid := NULL; END;

  unlocked := EXISTS (SELECT 1 FROM public.bounty_videos v WHERE v.request_id = _request_key)
    OR (rid IS NOT NULL AND EXISTS (SELECT 1 FROM public.claims c WHERE c.request_id = rid));
  IF NOT unlocked THEN RETURN false; END IF;

  IF EXISTS (SELECT 1 FROM public.bounty_videos v
             WHERE v.request_id = _request_key AND v.uploader_id = _user_id) THEN
    RETURN true;
  END IF;

  IF rid IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.requests r WHERE r.id = rid AND r.requester_id = _user_id) THEN
      RETURN true;
    END IF;
    IF EXISTS (SELECT 1 FROM public.claims c WHERE c.request_id = rid AND c.spotter_id = _user_id) THEN
      RETURN true;
    END IF;
  END IF;

  RETURN false;
END;
$$;

REVOKE ALL ON FUNCTION public.can_chat_on_request(text, uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.can_chat_on_request(text, uuid) TO authenticated, service_role;

CREATE TABLE public.request_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_key text NOT NULL,
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body text NOT NULL CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX request_messages_thread_idx ON public.request_messages (request_key, created_at);

GRANT SELECT, INSERT ON public.request_messages TO authenticated;
GRANT ALL ON public.request_messages TO service_role;
ALTER TABLE public.request_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants read bounty messages"
ON public.request_messages FOR SELECT TO authenticated
USING (public.can_chat_on_request(request_key, auth.uid()));

CREATE POLICY "Participants send bounty messages"
ON public.request_messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND public.can_chat_on_request(request_key, auth.uid()));

CREATE TABLE public.request_chat_reads (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_key text NOT NULL,
  last_read_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, request_key)
);

GRANT SELECT, INSERT, UPDATE ON public.request_chat_reads TO authenticated;
GRANT ALL ON public.request_chat_reads TO service_role;
ALTER TABLE public.request_chat_reads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own chat read markers" ON public.request_chat_reads
FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Set own chat read markers" ON public.request_chat_reads
FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Update own chat read markers" ON public.request_chat_reads
FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TRIGGER update_request_chat_reads_updated_at
BEFORE UPDATE ON public.request_chat_reads
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER PUBLICATION supabase_realtime ADD TABLE public.request_messages;