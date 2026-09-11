DROP POLICY IF EXISTS "Ratings are viewable by everyone" ON public.ratings;
CREATE POLICY "Participants can view their ratings"
ON public.ratings FOR SELECT TO authenticated
USING (rater_id = auth.uid() OR ratee_id = auth.uid());
REVOKE SELECT ON public.ratings FROM anon;

DROP POLICY IF EXISTS "Anyone can submit a support ticket" ON public.support_tickets;
CREATE POLICY "Anyone can submit a support ticket"
ON public.support_tickets FOR INSERT TO anon, authenticated
WITH CHECK (
  (auth.uid() IS NULL AND user_id IS NULL)
  OR (auth.uid() IS NOT NULL AND (user_id IS NULL OR user_id = auth.uid()))
);