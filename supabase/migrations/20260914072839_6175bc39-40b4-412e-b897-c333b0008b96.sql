-- Match the posts storage read policy to the posts table, which is now
-- authenticated-only. This prevents anonymous users from fetching post media
-- files directly even if they know the storage path.
DROP POLICY IF EXISTS "Post media readable for visible posts" ON storage.objects;

CREATE POLICY "Post media readable for signed-in users"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'posts'
    AND (
      (auth.uid())::text = (storage.foldername(name))[1]
      OR EXISTS (SELECT 1 FROM public.posts p WHERE p.media_path = storage.objects.name)
    )
  );
