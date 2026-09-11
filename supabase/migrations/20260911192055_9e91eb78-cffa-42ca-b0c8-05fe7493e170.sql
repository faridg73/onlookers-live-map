
-- 1. Start the review window when a bounty clip is submitted
CREATE OR REPLACE FUNCTION public.escrow_submit_on_bounty_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE rid uuid;
BEGIN
  BEGIN rid := NEW.request_id::uuid; EXCEPTION WHEN others THEN rid := NULL; END;
  IF rid IS NOT NULL THEN
    UPDATE public.escrows
    SET status = 'submitted',
        spotter_id = COALESCE(spotter_id, NEW.uploader_id),
        auto_release_at = now() + interval '2 hours',
        updated_at = now()
    WHERE request_id = rid AND status IN ('held','reserved');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS escrow_submit_on_bounty_video ON public.bounty_videos;
CREATE TRIGGER escrow_submit_on_bounty_video
AFTER INSERT ON public.bounty_videos
FOR EACH ROW EXECUTE FUNCTION public.escrow_submit_on_bounty_video();

-- 2. Block cancellation once a bounty has claims or submissions
CREATE OR REPLACE FUNCTION public.guard_request_cancellation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF OLD.status = 'completed' THEN
    RAISE EXCEPTION 'This request was already fulfilled and paid out';
  END IF;
  IF EXISTS (SELECT 1 FROM public.claims WHERE request_id = OLD.id) THEN
    RAISE EXCEPTION 'A reporter already claimed this bounty, so it can no longer be cancelled';
  END IF;
  IF EXISTS (SELECT 1 FROM public.media_uploads WHERE request_id = OLD.id) THEN
    RAISE EXCEPTION 'Media was already submitted for this bounty, so it can no longer be cancelled';
  END IF;
  IF EXISTS (SELECT 1 FROM public.bounty_videos WHERE request_id = OLD.id::text) THEN
    RAISE EXCEPTION 'A clip was already submitted for this bounty, so it can no longer be cancelled';
  END IF;
  IF EXISTS (SELECT 1 FROM public.escrows WHERE request_id = OLD.id AND status IN ('submitted','disputed','released')) THEN
    RAISE EXCEPTION 'This bounty is under review and can no longer be cancelled';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS guard_request_cancellation ON public.requests;
CREATE TRIGGER guard_request_cancellation
BEFORE DELETE ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.guard_request_cancellation();

-- 3. Auto-release 85% when the dispute window closes without a dispute
CREATE OR REPLACE FUNCTION public.settle_escrows()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
  -- 1. Auto-release submitted proof once the review window closed with no dispute
  FOR rec IN
    SELECT e.* FROM public.escrows e
    WHERE e.status = 'submitted' AND e.auto_release_at IS NOT NULL AND e.auto_release_at <= now()
    FOR UPDATE
  LOOP
    SELECT * INTO vid FROM public.bounty_videos
    WHERE request_id = rec.request_id::text AND accepted_at IS NULL
    ORDER BY created_at ASC LIMIT 1;

    spotter := COALESCE(vid.uploader_id, rec.spotter_id);
    fee := ROUND(rec.amount * 0.15, 2);
    net := rec.amount - fee;

    IF spotter IS NOT NULL AND net > 0 THEN
      PERFORM public.adjust_wallet(spotter, net, 'bounty_payout', rec.request_id,
        'Bounty earned (auto-released after review window)');

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

  -- 2. Free claims whose 15-minute lock ran out with no media submitted
  FOR rec IN
    SELECT e.id, e.request_id, e.spotter_id FROM public.escrows e
    WHERE e.status = 'reserved' AND e.reserved_until IS NOT NULL AND e.reserved_until <= now()
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

  -- 3. Refund escrow for requests that expired unfulfilled (never for submitted/disputed work)
  FOR rec IN
    SELECT e.id, e.requester_id, e.amount, r.id AS request_id
    FROM public.escrows e
    JOIN public.requests r ON r.id = e.request_id
    WHERE e.status = 'held' AND r.expires_at <= now() AND r.status IN ('open','claimed','expired')
  LOOP
    IF rec.amount > 0 THEN
      PERFORM public.adjust_wallet(rec.requester_id, rec.amount, 'escrow_refund', rec.request_id, 'Request expired - bounty refunded');
    END IF;
    UPDATE public.escrows SET status = 'refunded', updated_at = now() WHERE id = rec.id;
    UPDATE public.requests SET status = 'expired' WHERE id = rec.request_id AND status <> 'completed';
    refunded := refunded + 1;
  END LOOP;

  RETURN jsonb_build_object('auto_approved', auto_approved, 'unlocked', unlocked, 'refunded', refunded);
END;
$$;

-- 4. Requester-facing dispute: hold the funds until an admin resolves it
CREATE OR REPLACE FUNCTION public.dispute_bounty(_request_id uuid, _reason text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE e RECORD;
BEGIN
  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Nothing to dispute'; END IF;
  IF e.requester_id <> auth.uid() THEN RAISE EXCEPTION 'Only the person who posted this request can dispute it'; END IF;
  IF e.status <> 'submitted' THEN RAISE EXCEPTION 'The review window for this bounty has closed'; END IF;
  IF e.auto_release_at IS NOT NULL AND e.auto_release_at <= now() THEN
    RAISE EXCEPTION 'The review window for this bounty has closed';
  END IF;

  UPDATE public.escrows
  SET status = 'disputed', auto_release_at = NULL, dispute_reason = COALESCE(_reason, ''),
      disputed_at = now(), updated_at = now()
  WHERE id = e.id;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_escrows() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.escrow_submit_on_bounty_video() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.guard_request_cancellation() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.dispute_bounty(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.dispute_bounty(uuid, text) TO authenticated;
