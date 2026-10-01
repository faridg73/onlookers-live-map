CREATE OR REPLACE FUNCTION private.require_id_for_verified_visit()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.requests r WHERE r.id = NEW.request_id AND r.is_verified_visit)
     AND NOT EXISTS (
       SELECT 1 FROM public.profiles p
       WHERE p.id = NEW.spotter_id
         AND p.payout_identity_verified_at IS NOT NULL
         AND p.account_frozen_at IS NULL
     ) THEN
    RAISE EXCEPTION 'Verify your ID to claim a Verified Visit';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION private.require_id_for_verified_visit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_require_id_for_verified_visit ON public.claims;
CREATE TRIGGER trg_require_id_for_verified_visit
BEFORE INSERT OR UPDATE OF spotter_id, request_id ON public.claims
FOR EACH ROW EXECUTE FUNCTION private.require_id_for_verified_visit();