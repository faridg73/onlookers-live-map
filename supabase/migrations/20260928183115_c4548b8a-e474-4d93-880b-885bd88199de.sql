CREATE POLICY "No browser access to email codes"
ON public.email_otp_codes
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);

CREATE POLICY "No browser access to signup proofs"
ON public.signup_verification_proofs
FOR ALL
TO anon, authenticated
USING (false)
WITH CHECK (false);