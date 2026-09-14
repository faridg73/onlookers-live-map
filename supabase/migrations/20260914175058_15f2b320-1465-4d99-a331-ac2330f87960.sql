ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS is_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_requested_at timestamptz;

-- Only staff (or trusted internal writes) may flip is_verified.
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated profile updates are not allowed';
  END IF;

  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'moderator'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
       OR NEW.legacy_usd_balance IS DISTINCT FROM OLD.legacy_usd_balance
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.hunter_level IS DISTINCT FROM OLD.hunter_level
       OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
       OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
       OR NEW.is_verified IS DISTINCT FROM OLD.is_verified
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Protected profile fields cannot be changed directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Public card now carries the verified flag.
DROP FUNCTION IF EXISTS public.public_profile_card(uuid);
CREATE OR REPLACE FUNCTION public.public_profile_card(_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text, hunter_level integer, xp integer, is_incognito boolean, is_verified boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN p.is_incognito THEN COALESCE(p.alias, 'Onlooker_' || public.build_alias(p.id))
         ELSE COALESCE(p.display_name, 'onlooker') END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.avatar_url END,
    p.hunter_level, p.xp, p.is_incognito, p.is_verified
  FROM public.profiles p
  WHERE p.id = _user_id;
$$;

-- Self-service application for verification.
CREATE OR REPLACE FUNCTION public.request_creator_verification()
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _stamp timestamptz := now();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to apply for creator verification';
  END IF;

  PERFORM set_config('app.trusted_write', 'on', true);
  UPDATE public.profiles
     SET verification_requested_at = _stamp,
         updated_at = now()
   WHERE id = _uid
     AND is_verified = false;
  PERFORM set_config('app.trusted_write', 'off', true);

  RETURN _stamp;
END;
$$;

REVOKE ALL ON FUNCTION public.request_creator_verification() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_creator_verification() TO authenticated;

-- Staff review queue.
CREATE OR REPLACE FUNCTION public.pending_verification_requests()
RETURNS TABLE(user_id uuid, display_name text, hunter_level integer, xp integer, requested_at timestamptz)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.id, COALESCE(p.display_name, 'onlooker'), p.hunter_level, p.xp, p.verification_requested_at
  FROM public.profiles p
  WHERE p.verification_requested_at IS NOT NULL
    AND p.is_verified = false
    AND public.is_review_staff(auth.uid())
  ORDER BY p.verification_requested_at ASC;
$$;

REVOKE ALL ON FUNCTION public.pending_verification_requests() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pending_verification_requests() TO authenticated;