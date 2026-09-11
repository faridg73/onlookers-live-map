
DROP POLICY IF EXISTS "Signed-in users can view bounty videos" ON public.bounty_videos;

CREATE POLICY "Viewers can see public or own bounty videos"
ON public.bounty_videos FOR SELECT TO authenticated
USING (
  is_public
  OR auth.uid() = uploader_id
  OR auth.uid() = accepted_by
  OR EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id::text = bounty_videos.request_id
      AND r.requester_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Signed-in users can read bounty videos" ON storage.objects;

CREATE POLICY "Readers can read permitted bounty video files"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'bounty-videos'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.bounty_videos v
      WHERE (v.storage_path = objects.name OR v.thumb_path = objects.name)
        AND (
          v.is_public
          OR v.uploader_id = auth.uid()
          OR v.accepted_by = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.requests r
            WHERE r.id::text = v.request_id AND r.requester_id = auth.uid()
          )
        )
    )
  )
);
