REVOKE ALL ON FUNCTION public.chat_participants(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.mark_chat_notifications_read(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.notify_chat_message() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.chat_participants(text) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.mark_chat_notifications_read(text) TO authenticated, service_role;