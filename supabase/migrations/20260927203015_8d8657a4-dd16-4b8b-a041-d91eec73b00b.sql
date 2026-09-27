DROP POLICY IF EXISTS "Post media readable for signed-in users" ON storage.objects;

CREATE POLICY "Post media readable for signed-in users"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'posts'
  AND (
    (auth.uid())::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.community_posts c
      WHERE c.media_path = storage.objects.name
        AND c.hidden_at IS NULL
    )
  )
);

DROP TABLE IF EXISTS public.posts;