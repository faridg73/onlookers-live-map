CREATE OR REPLACE FUNCTION public.qa_reset_identity_status(_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM set_config('app.trusted_write', 'on', true);
  UPDATE public.profiles
     SET payout_identity_verified_at = NULL,
         payout_identity_fee_charged_at = NULL,
         payout_country = NULL
   WHERE id = _uid;
  DELETE FROM public.payout_security_logs
   WHERE user_id = _uid AND event_type IN ('identity_started', 'identity_verified');
  PERFORM set_config('app.trusted_write', 'off', true);
END $$;

REVOKE EXECUTE ON FUNCTION public.qa_reset_identity_status(uuid) FROM PUBLIC, anon, authenticated;