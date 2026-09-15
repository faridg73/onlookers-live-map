ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

CREATE OR REPLACE FUNCTION public.notify_new_follower()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  follower_name text;
BEGIN
  SELECT display_name INTO follower_name FROM public.profiles WHERE id = NEW.follower_id;
  INSERT INTO public.notifications (user_id, kind, request_key, sender_id, preview)
  VALUES (
    NEW.followee_id,
    'new_follower',
    'follow:' || NEW.follower_id::text,
    NEW.follower_id,
    COALESCE(follower_name, 'Someone') || ' started following you.'
  );
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.notify_new_follower() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.notify_new_follower() TO service_role;

CREATE TRIGGER user_follows_notify AFTER INSERT ON public.user_follows
FOR EACH ROW EXECUTE FUNCTION public.notify_new_follower();