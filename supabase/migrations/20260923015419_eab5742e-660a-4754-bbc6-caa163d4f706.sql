ALTER TABLE public.escrows ADD COLUMN IF NOT EXISTS submission_started_at timestamptz;

CREATE OR REPLACE FUNCTION public.begin_bounty_submission(_request_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE e RECORD; grace_minutes int := 10;
BEGIN
  SELECT * INTO e FROM public.escrows
  WHERE request_id = _request_id AND spotter_id = auth.uid()
    AND status IN ('reserved','submitted')
  ORDER BY updated_at DESC LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'You are not the onlooker working this bounty right now.';
  END IF;

  IF e.status = 'reserved' AND e.submission_started_at IS NULL THEN
    PERFORM set_config('app.trusted_write', 'on', true);
    UPDATE public.escrows
    SET submission_started_at = now(), updated_at = now()
    WHERE id = e.id;
    PERFORM set_config('app.trusted_write', 'off', true);
    e.submission_started_at := now();
  END IF;

  RETURN jsonb_build_object(
    'status', e.status,
    'reserved_until', e.reserved_until,
    'submission_started_at', e.submission_started_at,
    'grace_until', COALESCE(e.submission_started_at, now()) + make_interval(mins => grace_minutes)
  );
END;
$function$;

GRANT EXECUTE ON FUNCTION public.begin_bounty_submission(uuid) TO authenticated;

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
      -- Grace buffer: an upload that began before the cutoff keeps its claim
      -- (and its payout) while it finishes landing.
      AND (e.submission_started_at IS NULL
           OR e.submission_started_at + interval '10 minutes' <= now())
  LOOP
    DELETE FROM public.claims
    WHERE request_id = rec.request_id AND spotter_id = rec.spotter_id AND status = 'in_progress';

    UPDATE public.escrows
    SET status = 'held', spotter_id = NULL, reserved_until = NULL, submission_started_at = NULL, updated_at = now()
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