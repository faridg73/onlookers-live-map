CREATE OR REPLACE FUNCTION public.settle_escrows()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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

  -- 2. Free claims whose lock ran out, or whose request deadline passed with no media
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