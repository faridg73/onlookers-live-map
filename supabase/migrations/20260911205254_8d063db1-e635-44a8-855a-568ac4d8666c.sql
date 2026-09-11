-- Restrict which columns non-owners can change on claims
CREATE OR REPLACE FUNCTION public.guard_claim_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF NEW.id <> OLD.id OR NEW.request_id <> OLD.request_id OR NEW.spotter_id <> OLD.spotter_id THEN
    RAISE EXCEPTION 'Only the claim status may be changed';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_claim_updates ON public.claims;
CREATE TRIGGER guard_claim_updates
BEFORE UPDATE ON public.claims
FOR EACH ROW EXECUTE FUNCTION public.guard_claim_updates();

-- Spotters may only move a claimed request's status, nothing else
CREATE OR REPLACE FUNCTION public.guard_request_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NOT NULL AND auth.uid() <> OLD.requester_id THEN
    IF NEW.id <> OLD.id
       OR NEW.requester_id <> OLD.requester_id
       OR NEW.bounty_amount <> OLD.bounty_amount
       OR COALESCE(NEW.expires_at, '-infinity'::timestamptz) <> COALESCE(OLD.expires_at, '-infinity'::timestamptz)
       OR COALESCE(NEW.lat, 0) <> COALESCE(OLD.lat, 0)
       OR COALESCE(NEW.lng, 0) <> COALESCE(OLD.lng, 0)
       OR COALESCE(NEW.title, '') <> COALESCE(OLD.title, '')
       OR COALESCE(NEW.location_name, '') <> COALESCE(OLD.location_name, '') THEN
      RAISE EXCEPTION 'Only the request status may be changed by a spotter';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_request_updates ON public.requests;
CREATE TRIGGER guard_request_updates
BEFORE UPDATE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.guard_request_updates();

-- Post media files are only readable when their post is publicly visible
DROP POLICY IF EXISTS "Post media is readable by everyone" ON storage.objects;
CREATE POLICY "Post media readable for visible posts"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'posts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (SELECT 1 FROM public.posts p WHERE p.media_path = storage.objects.name)
  )
);