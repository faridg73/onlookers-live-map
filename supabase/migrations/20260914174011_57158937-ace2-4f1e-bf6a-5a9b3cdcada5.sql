-- Same trusted-backend exemption for the remaining guards: escrow settlement,
-- claim/status transitions and the media lifecycle job run without a user session.
CREATE OR REPLACE FUNCTION public.guard_requests_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated request updates are not allowed';
  END IF;

  IF public.is_review_staff(auth.uid()) OR auth.uid() = OLD.requester_id THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.claims c
    WHERE c.request_id = OLD.id
      AND c.spotter_id = auth.uid()
      AND c.status IN ('in_progress', 'submitted')
  ) THEN
    IF NEW.status IS DISTINCT FROM OLD.status THEN
      IF OLD.status = 'open' AND NEW.status = 'claimed' THEN
        RETURN NEW;
      END IF;
      IF OLD.status = 'claimed' AND NEW.status = 'completed' THEN
        RETURN NEW;
      END IF;
      RAISE EXCEPTION 'Spotters can only mark a request as claimed or completed';
    END IF;
    RAISE EXCEPTION 'Spotters can only change the request status';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.guard_bounty_video_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

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
$function$;

CREATE OR REPLACE FUNCTION public.guard_community_posts_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

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
$function$;

-- Internal status/lifecycle helpers mark themselves as trusted for their transaction.
CREATE OR REPLACE FUNCTION public.mark_request_claimed()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  PERFORM set_config('app.trusted_write', 'on', true);
  UPDATE public.requests
  SET status = 'claimed'
  WHERE id = NEW.request_id
    AND status = 'open'
    AND expires_at > now();
  PERFORM set_config('app.trusted_write', 'off', true);
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.complete_request_when_claim_approved()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    PERFORM set_config('app.trusted_write', 'on', true);
    UPDATE public.requests
    SET status = 'completed', updated_at = now()
    WHERE id = NEW.request_id AND status <> 'completed';
    PERFORM set_config('app.trusted_write', 'off', true);
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.settle_escrows()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  vid RECORD;
  fee numeric;
  net numeric;
  spotter uuid;
  auto_approved int := 0;
  refunded int := 0;
  unlocked int := 0;
BEGIN
  PERFORM set_config('app.trusted_write', 'on', true);

  FOR rec IN
    SELECT e.* FROM public.escrows e
    WHERE e.status = 'submitted' AND e.auto_release_at IS NOT NULL AND e.auto_release_at <= now()
    FOR UPDATE
  LOOP
    SELECT * INTO vid FROM public.bounty_videos
    WHERE request_id = rec.request_id::text AND accepted_at IS NULL
    ORDER BY created_at ASC LIMIT 1;

    spotter := COALESCE(vid.uploader_id, rec.spotter_id);
    fee := ROUND(rec.amount * 0.15);
    net := ROUND(rec.amount) - fee;

    IF spotter IS NOT NULL AND net > 0 THEN
      PERFORM public.adjust_wallet(spotter, net, 'bounty_payout', rec.request_id,
        'Looker Coins earned (auto-released after review window)');
      PERFORM set_config('app.trusted_write', 'on', true);

      INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
      VALUES (rec.request_id, spotter, rec.amount, fee);

      IF vid.id IS NOT NULL THEN
        UPDATE public.bounty_videos
        SET accepted_at = now(), accepted_by = rec.requester_id, payout_amount = net, updated_at = now()
        WHERE id = vid.id;
      END IF;

      UPDATE public.escrows
      SET status = 'released', spotter_id = spotter, updated_at = now()
      WHERE id = rec.id;

      UPDATE public.requests SET status = 'completed', updated_at = now()
      WHERE id = rec.request_id AND status <> 'completed';

      UPDATE public.claims SET status = 'approved', updated_at = now()
      WHERE request_id = rec.request_id AND status <> 'approved';

      auto_approved := auto_approved + 1;
    END IF;
  END LOOP;

  FOR rec IN
    SELECT e.id, e.request_id, e.spotter_id
    FROM public.escrows e
    JOIN public.requests r ON r.id = e.request_id
    WHERE e.status = 'reserved'
      AND ((e.reserved_until IS NOT NULL AND e.reserved_until <= now())
           OR r.expires_at <= now())
  LOOP
    DELETE FROM public.claims
    WHERE request_id = rec.request_id AND spotter_id = rec.spotter_id AND status = 'in_progress';

    UPDATE public.escrows
    SET status = 'held', spotter_id = NULL, reserved_until = NULL, updated_at = now()
    WHERE id = rec.id;

    UPDATE public.requests
    SET status = 'open'
    WHERE id = rec.request_id AND status = 'claimed' AND expires_at > now();

    unlocked := unlocked + 1;
  END LOOP;

  FOR rec IN
    SELECT e.id, e.requester_id, e.amount, r.id AS request_id
    FROM public.escrows e
    JOIN public.requests r ON r.id = e.request_id
    WHERE e.status = 'held' AND r.expires_at <= now() AND r.status IN ('open','claimed','expired')
  LOOP
    IF rec.amount > 0 THEN
      PERFORM public.adjust_wallet(rec.requester_id, rec.amount, 'escrow_refund', rec.request_id, 'Request expired - Looker Coins refunded');
    END IF;
    PERFORM set_config('app.trusted_write', 'on', true);
    UPDATE public.escrows SET status = 'refunded', updated_at = now() WHERE id = rec.id;
    UPDATE public.requests SET status = 'expired' WHERE id = rec.request_id AND status <> 'completed';
    refunded := refunded + 1;
  END LOOP;

  PERFORM set_config('app.trusted_write', 'off', true);
  RETURN jsonb_build_object('auto_approved', auto_approved, 'unlocked', unlocked, 'refunded', refunded);
END;
$function$;