-- Harden remaining privilege-escalation paths flagged by the security scan.
-- These BEFORE UPDATE triggers enforce column-level restrictions that broad
-- RLS policies cannot express on their own.

-- 1. Profiles: block direct edits to wallet, XP, level, warnings, bans, etc.
--    Safe fields (display_name, full_name, avatar_url, onboarded, terms_accepted_at,
--    onboarding_completed, is_incognito) remain user-editable.
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated profile updates are not allowed';
  END IF;

  -- Staff can update anything.
  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'moderator'::public.app_role) THEN
    RETURN NEW;
  END IF;

  -- Users editing their own row cannot touch protected fields.
  IF auth.uid() = OLD.id THEN
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
       OR NEW.legacy_usd_balance IS DISTINCT FROM OLD.legacy_usd_balance
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.hunter_level IS DISTINCT FROM OLD.hunter_level
       OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
       OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Protected profile fields cannot be changed directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop any duplicate triggers and re-attach a single one.
DROP TRIGGER IF EXISTS guard_profile_updates_trigger ON public.profiles;
DROP TRIGGER IF EXISTS guard_profile_updates ON public.profiles;
CREATE TRIGGER guard_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_profile_updates();

GRANT EXECUTE ON FUNCTION public.guard_profile_updates() TO authenticated;

-- 2. Bounty videos: uploaders cannot falsify payout, acceptance, lifecycle or view metrics.
CREATE OR REPLACE FUNCTION public.guard_bounty_video_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated bounty video updates are not allowed';
  END IF;

  IF public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.uploader_id THEN
    IF NEW.payout_amount IS DISTINCT FROM OLD.payout_amount
      OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
      OR NEW.accepted_by IS DISTINCT FROM OLD.accepted_by
      OR NEW.expired_at IS DISTINCT FROM OLD.expired_at
      OR NEW.purged_at IS DISTINCT FROM OLD.purged_at
      OR NEW.view_count IS DISTINCT FROM OLD.view_count
    THEN
      RAISE EXCEPTION 'Uploaders cannot change payout, acceptance, lifecycle, or view metrics on bounty videos';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_bounty_video_update_trigger ON public.bounty_videos;
DROP TRIGGER IF EXISTS guard_bounty_video_update ON public.bounty_videos;
CREATE TRIGGER guard_bounty_video_update
  BEFORE UPDATE ON public.bounty_videos
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_bounty_video_update();

GRANT EXECUTE ON FUNCTION public.guard_bounty_video_update() TO authenticated;

-- 3. Community posts: authors cannot self-promote by editing pinned fields or view_count.
CREATE OR REPLACE FUNCTION public.guard_community_posts_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated community post updates are not allowed';
  END IF;

  IF public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.user_id THEN
    IF NEW.pinned_until IS DISTINCT FROM OLD.pinned_until
       OR NEW.pinned_credits IS DISTINCT FROM OLD.pinned_credits
       OR NEW.view_count IS DISTINCT FROM OLD.view_count
    THEN
      RAISE EXCEPTION 'Authors cannot edit pinned status, pinned credits, or view counts on community posts';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_community_posts_update ON public.community_posts;
CREATE TRIGGER guard_community_posts_update
  BEFORE UPDATE ON public.community_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_community_posts_update();

GRANT EXECUTE ON FUNCTION public.guard_community_posts_update() TO authenticated;

-- 4. Claims: existing guard_claim_updates and enforce_claim_update_rules already cover
--    status transitions; refresh them so they are the active triggers and remove any
--    duplicates that may have accumulated.
DROP TRIGGER IF EXISTS guard_claim_updates_trigger ON public.claims;
DROP TRIGGER IF EXISTS guard_claim_updates ON public.claims;
CREATE TRIGGER guard_claim_updates
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_claim_updates();

DROP TRIGGER IF EXISTS enforce_claim_update_rules_trigger ON public.claims;
DROP TRIGGER IF EXISTS enforce_claim_update_rules ON public.claims;
CREATE TRIGGER enforce_claim_update_rules
  BEFORE UPDATE ON public.claims
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_claim_update_rules();

-- 5. Bounty pools: refresh the guard trigger and remove duplicates.
DROP TRIGGER IF EXISTS guard_bounty_pool_updates_trigger ON public.bounty_pools;
DROP TRIGGER IF EXISTS guard_bounty_pool_updates ON public.bounty_pools;
CREATE TRIGGER guard_bounty_pool_updates
  BEFORE UPDATE ON public.bounty_pools
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_bounty_pool_updates();

-- Ensure the role-check helper remains reachable to authenticated users.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
