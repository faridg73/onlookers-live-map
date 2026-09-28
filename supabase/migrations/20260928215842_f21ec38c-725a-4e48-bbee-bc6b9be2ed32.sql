CREATE OR REPLACE FUNCTION public.record_payout_identity_verified(_uid uuid, _country text, _unfreeze boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM set_config('app.trusted_write', 'on', true);
  UPDATE public.profiles
     SET payout_identity_verified_at = COALESCE(payout_identity_verified_at, now()),
         payout_country = COALESCE(payout_country, upper(_country)),
         account_frozen_at = CASE WHEN _unfreeze THEN NULL ELSE account_frozen_at END
   WHERE id = _uid;
  PERFORM set_config('app.trusted_write', 'off', true);
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.record_payout_identity_verified(uuid, text, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_payout_identity_verified(uuid, text, boolean) TO service_role;