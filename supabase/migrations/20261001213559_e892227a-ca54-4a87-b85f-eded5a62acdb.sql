CREATE OR REPLACE FUNCTION private.is_disputed_request(_request_id text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.escrows e WHERE e.request_id::text = _request_id AND e.status = 'disputed');
$$;
REVOKE EXECUTE ON FUNCTION private.is_disputed_request(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_disputed_request(text) TO authenticated;

DROP POLICY IF EXISTS "Review staff can watch disputed clips" ON public.bounty_videos;
CREATE POLICY "Review staff can watch disputed clips" ON public.bounty_videos
FOR SELECT TO authenticated
USING (public.is_review_staff(auth.uid()) AND private.is_disputed_request(request_id));

DROP POLICY IF EXISTS "Review staff can read bounty video files" ON storage.objects;
CREATE POLICY "Review staff can read bounty video files" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'bounty-videos'
  AND public.is_review_staff(auth.uid())
  AND EXISTS (
    SELECT 1 FROM public.bounty_videos v
    WHERE (v.storage_path = objects.name OR v.thumb_path = objects.name)
      AND private.is_disputed_request(v.request_id)
  )
);

DROP FUNCTION IF EXISTS public.is_disputed_request(text);