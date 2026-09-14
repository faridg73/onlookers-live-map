DROP POLICY IF EXISTS "Spotters can update their own claims" ON public.claims;
CREATE POLICY "Spotters can update their own claims"
ON public.claims
FOR UPDATE
TO authenticated
USING (auth.uid() = spotter_id)
WITH CHECK (auth.uid() = spotter_id);