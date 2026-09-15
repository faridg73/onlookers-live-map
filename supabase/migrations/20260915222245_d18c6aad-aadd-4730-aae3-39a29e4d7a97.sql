DROP POLICY IF EXISTS "Anyone can see follows" ON public.user_follows;
CREATE POLICY "Users can see their own follow links" ON public.user_follows FOR SELECT TO authenticated USING (auth.uid() = follower_id OR auth.uid() = followee_id);
REVOKE SELECT ON public.user_follows FROM anon;