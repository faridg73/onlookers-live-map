DROP POLICY IF EXISTS "Anyone signed in can comment" ON public.video_comments;
DROP POLICY IF EXISTS "Users can comment" ON public.video_comments;
DROP POLICY IF EXISTS "Signed-in users can comment" ON public.video_comments;
CREATE POLICY "Comments only on public clips" ON public.video_comments
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.bounty_videos v WHERE v.id = video_id AND v.is_public AND v.accepted_at IS NOT NULL)
);

DROP POLICY IF EXISTS "Anyone signed in can review" ON public.video_reviews;
DROP POLICY IF EXISTS "Users can review" ON public.video_reviews;
DROP POLICY IF EXISTS "Signed-in users can review" ON public.video_reviews;
CREATE POLICY "Reviews only on public clips" ON public.video_reviews
FOR INSERT TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND EXISTS (SELECT 1 FROM public.bounty_videos v WHERE v.id = video_id AND v.is_public AND v.accepted_at IS NOT NULL)
);