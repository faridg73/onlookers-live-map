CREATE OR REPLACE FUNCTION public.enforce_broadcast_safeguards()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _created timestamptz;
  _recent int;
BEGIN
  IF NOT ('free broadcast' = ANY(NEW.tags)) THEN
    RETURN NEW;
  END IF;
  SELECT created_at INTO _created FROM auth.users WHERE id = NEW.user_id;
  IF _created IS NOT NULL AND _created > now() - interval '10 minutes' THEN
    RAISE EXCEPTION 'BROADCAST_COOLDOWN: New accounts can go live 10 minutes after sign-up.';
  END IF;
  SELECT count(*) INTO _recent FROM public.community_posts
   WHERE user_id = NEW.user_id AND 'free broadcast' = ANY(tags)
     AND created_at > now() - interval '1 hour';
  IF _recent >= 3 THEN
    RAISE EXCEPTION 'BROADCAST_RATE_LIMIT: You can start up to 3 live streams per hour.';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS enforce_broadcast_safeguards ON public.community_posts;
CREATE TRIGGER enforce_broadcast_safeguards BEFORE INSERT ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.enforce_broadcast_safeguards();

CREATE OR REPLACE FUNCTION public.my_broadcast_status()
RETURNS TABLE(cooldown_until timestamptz, streams_last_hour int, next_slot_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT created_at + interval '10 minutes' FROM auth.users WHERE id = auth.uid()),
    (SELECT count(*)::int FROM public.community_posts WHERE user_id = auth.uid() AND 'free broadcast' = ANY(tags) AND created_at > now() - interval '1 hour'),
    (SELECT min(created_at) + interval '1 hour' FROM public.community_posts WHERE user_id = auth.uid() AND 'free broadcast' = ANY(tags) AND created_at > now() - interval '1 hour');
$$;
REVOKE EXECUTE ON FUNCTION public.my_broadcast_status() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.my_broadcast_status() TO authenticated;