-- Requesters may only approve a claim on their own request, not set arbitrary statuses
DROP POLICY "Requesters can approve claims on their requests" ON public.claims;
CREATE POLICY "Requesters can approve claims on their requests"
  ON public.claims
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = claims.request_id AND r.requester_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id = claims.request_id AND r.requester_id = auth.uid()
    )
    AND status = 'approved'::claim_status
  );

-- Expired clips stay hidden even in the broader public/own-video rule
DROP POLICY "Viewers can see public or own bounty videos" ON public.bounty_videos;
CREATE POLICY "Viewers can see public or own bounty videos"
  ON public.bounty_videos
  FOR SELECT
  TO authenticated
  USING (
    (is_public = true AND expired_at IS NULL)
    OR auth.uid() = uploader_id
    OR auth.uid() = accepted_by
    OR EXISTS (
      SELECT 1 FROM public.requests r
      WHERE r.id::text = bounty_videos.request_id AND r.requester_id = auth.uid()
    )
  );
