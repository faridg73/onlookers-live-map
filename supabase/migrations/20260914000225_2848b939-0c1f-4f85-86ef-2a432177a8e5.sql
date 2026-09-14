





CREATE OR REPLACE FUNCTION public.guard_bounty_video_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  -- Uploaders may only edit descriptive fields; payout/acceptance/lifecycle fields are server-controlled.
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

GRANT EXECUTE ON FUNCTION public.guard_bounty_video_update() TO authenticated;
GRANT EXECUTE ON FUNCTION public.guard_bounty_video_update() TO service_role;

DROP TRIGGER IF EXISTS guard_bounty_video_update ON public.bounty_videos;
CREATE TRIGGER guard_bounty_video_update
BEFORE UPDATE ON public.bounty_videos
FOR EACH ROW
EXECUTE FUNCTION public.guard_bounty_video_update();

-- Tighten the spotter UPDATE policy so it only permits submitting an in-progress claim.
DROP POLICY IF EXISTS "Spotters can update their own claims" ON public.claims;
CREATE POLICY "Spotters can update their own claims"
ON public.claims
FOR UPDATE
TO authenticated
USING (auth.uid() = spotter_id)
WITH CHECK (
  auth.uid() = spotter_id
  AND status IN ('in_progress', 'submitted')
  AND EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.id = id AND c.status = 'in_progress'
  )
);