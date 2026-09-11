-- Replace the overly broad bounty_boosts SELECT policy with one scoped to involved users.
DROP POLICY IF EXISTS "bounty_boosts_select" ON public.bounty_boosts;
CREATE POLICY "bounty_boosts_select" ON public.bounty_boosts
FOR SELECT TO authenticated
USING (
  auth.uid() = booster_id
  OR auth.uid() IN (
    SELECT requester_id FROM public.requests WHERE id = bounty_boosts.request_id::uuid
  )
  OR auth.uid() IN (
    SELECT spotter_id FROM public.claims WHERE request_id = bounty_boosts.request_id::uuid
  )
);