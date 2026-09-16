CREATE OR REPLACE FUNCTION public.protect_profile_system_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') AND (
    NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance OR
    NEW.legacy_usd_balance IS DISTINCT FROM OLD.legacy_usd_balance OR
    NEW.xp IS DISTINCT FROM OLD.xp OR
    NEW.hunter_level IS DISTINCT FROM OLD.hunter_level OR
    NEW.is_verified IS DISTINCT FROM OLD.is_verified OR
    NEW.warning_count IS DISTINCT FROM OLD.warning_count OR
    NEW.banned_at IS DISTINCT FROM OLD.banned_at OR
    NEW.phone IS DISTINCT FROM OLD.phone OR
    NEW.phone_verified_at IS DISTINCT FROM OLD.phone_verified_at OR
    NEW.follower_count IS DISTINCT FROM OLD.follower_count OR
    NEW.rating IS DISTINCT FROM OLD.rating
  ) THEN
    RAISE EXCEPTION 'Protected profile fields can only be changed by trusted server operations';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_system_fields ON public.profiles;
CREATE TRIGGER protect_profile_system_fields
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.protect_profile_system_fields();

REVOKE ALL ON FUNCTION public.protect_profile_system_fields() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.protect_profile_system_fields() TO service_role;