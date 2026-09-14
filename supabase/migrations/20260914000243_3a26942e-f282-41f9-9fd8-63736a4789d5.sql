CREATE OR REPLACE FUNCTION public.guard_bounty_video_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.uploader_id THEN
    IF NEW.payout_amount IS DISTINCT FROM OLD.payout_amount
      OR NEW.accepted_at IS DISTINCT FROM OLD.accepted_at
      OR NEW.accepted_by IS DISTINCT FROM OLD.accepted_by
      OR NEW.expired_at IS DISTINCT FROM OLD.expired_at
      OR NEW.purged_at IS DISTINCT FROM OLD.purged_at THEN
      RAISE EXCEPTION 'Uploaders cannot change payout, acceptance, or lifecycle fields on bounty videos';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.guard_bounty_video_update() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.guard_bounty_video_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_bounty_video_update() TO service_role;