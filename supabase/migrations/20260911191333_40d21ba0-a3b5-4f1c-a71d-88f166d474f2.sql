
-- Shared guard: is this request still accepting work?
CREATE OR REPLACE FUNCTION public.request_is_live(_request_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = _request_id
      AND r.expires_at > now()
      AND r.status IN ('open', 'claimed')
  )
$$;

REVOKE ALL ON FUNCTION public.request_is_live(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_is_live(uuid) TO authenticated, service_role;

-- Late proof uploads are rejected
CREATE OR REPLACE FUNCTION public.validate_media_upload()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND NEW.spotter_id <> auth.uid() THEN
    RAISE EXCEPTION 'Spotters can only upload media as themselves';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = NEW.request_id AND c.spotter_id = NEW.spotter_id
  ) THEN
    RAISE EXCEPTION 'Media must belong to a claim by this spotter';
  END IF;
  IF NOT public.request_is_live(NEW.request_id) THEN
    RAISE EXCEPTION 'This request has expired - submissions are closed';
  END IF;
  IF NEW.captured_at > now() + interval '5 minutes' THEN
    RAISE EXCEPTION 'Capture time cannot be in the future';
  END IF;
  RETURN NEW;
END;
$$;

-- Late bounty clip submissions are rejected
CREATE OR REPLACE FUNCTION public.validate_bounty_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  as_uuid uuid;
BEGIN
  BEGIN
    as_uuid := NEW.request_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW; -- local/demo request ids are not tracked in the requests table
  END;

  IF EXISTS (SELECT 1 FROM public.requests r WHERE r.id = as_uuid)
     AND NOT public.request_is_live(as_uuid) THEN
    RAISE EXCEPTION 'This bounty has expired - uploads are closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_bounty_video_insert ON public.bounty_videos;
CREATE TRIGGER validate_bounty_video_insert
BEFORE INSERT ON public.bounty_videos
FOR EACH ROW EXECUTE FUNCTION public.validate_bounty_video();

-- Chip-ins are rejected once the bounty is closed
CREATE OR REPLACE FUNCTION public.validate_bounty_boost()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  as_uuid uuid;
BEGIN
  BEGIN
    as_uuid := NEW.request_id::uuid;
  EXCEPTION WHEN others THEN
    RETURN NEW;
  END;

  IF EXISTS (SELECT 1 FROM public.requests r WHERE r.id = as_uuid)
     AND NOT public.request_is_live(as_uuid) THEN
    RAISE EXCEPTION 'This bounty has expired - chip-ins are closed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_bounty_boost_insert ON public.bounty_boosts;
CREATE TRIGGER validate_bounty_boost_insert
BEFORE INSERT ON public.bounty_boosts
FOR EACH ROW EXECUTE FUNCTION public.validate_bounty_boost();

-- Mark requests expired as soon as the deadline passes, even before the refund sweep
CREATE OR REPLACE FUNCTION public.close_expired_requests()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  closed integer;
BEGIN
  UPDATE public.requests
  SET status = 'expired'
  WHERE expires_at <= now() AND status IN ('open', 'claimed');
  GET DIAGNOSTICS closed = ROW_COUNT;
  PERFORM public.settle_escrows();
  RETURN closed;
END;
$$;

REVOKE ALL ON FUNCTION public.close_expired_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.close_expired_requests() TO authenticated, service_role;

SELECT cron.schedule(
  'close-expired-bounties',
  '0 * * * *',
  $$SELECT public.close_expired_requests();$$
);
