-- 1. Chat attachment storage: participants only
DROP POLICY IF EXISTS "Chat participants can view attachments" ON storage.objects;
CREATE POLICY "Chat participants can view attachments"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'chat-attachments'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.can_chat_on_request((storage.foldername(name))[2], auth.uid())
  )
);

DROP POLICY IF EXISTS "Chat participants can upload their own attachments" ON storage.objects;
CREATE POLICY "Chat participants can upload their own attachments"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'chat-attachments'
  AND (storage.foldername(name))[1] = (auth.uid())::text
  AND public.can_chat_on_request((storage.foldername(name))[2], auth.uid())
);

-- 2. Tips are private to the two parties
DROP POLICY IF EXISTS "Tips are visible to everyone" ON public.video_tips;
CREATE POLICY "Tip parties can view their tips"
ON public.video_tips FOR SELECT TO authenticated
USING (tipper_id = auth.uid() OR creator_id = auth.uid());

-- 3. Notifications
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'chat_message',
  request_key text NOT NULL,
  message_id uuid,
  sender_id uuid,
  preview text NOT NULL DEFAULT '',
  read_at timestamptz,
  emailed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Own notifications are readable"
ON public.notifications FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Own notifications are updatable"
ON public.notifications FOR UPDATE TO authenticated
USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE INDEX notifications_user_unread_idx
ON public.notifications (user_id, read_at, created_at DESC);

CREATE TRIGGER notifications_updated_at
BEFORE UPDATE ON public.notifications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Who is in a bounty conversation
CREATE OR REPLACE FUNCTION public.chat_participants(_request_key text)
RETURNS TABLE(user_id uuid)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE rid uuid;
BEGIN
  BEGIN rid := _request_key::uuid; EXCEPTION WHEN others THEN rid := NULL; END;

  RETURN QUERY
  SELECT v.uploader_id FROM public.bounty_videos v WHERE v.request_id = _request_key
  UNION
  SELECT r.requester_id FROM public.requests r WHERE rid IS NOT NULL AND r.id = rid
  UNION
  SELECT c.spotter_id FROM public.claims c WHERE rid IS NOT NULL AND c.request_id = rid;
END;
$$;

CREATE OR REPLACE FUNCTION public.notify_chat_message()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.notifications (user_id, kind, request_key, message_id, sender_id, preview)
  SELECT p.user_id, 'chat_message', NEW.request_key, NEW.id, NEW.sender_id,
         CASE
           WHEN coalesce(NEW.body, '') <> '' THEN left(NEW.body, 140)
           WHEN NEW.media_type = 'video' THEN 'Sent a video clip'
           WHEN NEW.media_type = 'image' THEN 'Sent a photo'
           ELSE 'New message'
         END
  FROM public.chat_participants(NEW.request_key) p
  WHERE p.user_id IS NOT NULL AND p.user_id <> NEW.sender_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_chat_message ON public.request_messages;
CREATE TRIGGER notify_on_chat_message
AFTER INSERT ON public.request_messages
FOR EACH ROW EXECUTE FUNCTION public.notify_chat_message();

-- Mark a conversation's alerts read
CREATE OR REPLACE FUNCTION public.mark_chat_notifications_read(_request_key text)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
DECLARE n integer;
BEGIN
  IF auth.uid() IS NULL THEN RETURN 0; END IF;
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.uid()
     AND request_key = _request_key
     AND read_at IS NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

GRANT EXECUTE ON FUNCTION public.chat_participants(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_chat_notifications_read(text) TO authenticated, service_role;