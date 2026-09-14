-- The 'posts' table is no longer used by the app (only the storage bucket enum remains).
-- Restrict its broad public read policy to authenticated users to avoid exposing
-- user_id, location strings and media paths to anonymous visitors.
DROP POLICY IF EXISTS "Posts are viewable by everyone" ON public.posts;

CREATE POLICY "Signed-in users can view posts"
  ON public.posts
  FOR SELECT
  TO authenticated
  USING (true);
