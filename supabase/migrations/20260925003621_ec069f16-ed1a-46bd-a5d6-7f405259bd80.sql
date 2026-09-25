CREATE OR REPLACE FUNCTION public.accept_bounty_video(_video_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v RECORD; fee numeric; net numeric; rid uuid; req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to accept a clip'; END IF;

  SELECT * INTO v FROM public.bounty_videos WHERE id = _video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clip not found'; END IF;
  IF v.uploader_id = auth.uid() THEN RAISE EXCEPTION 'You cannot accept your own clip'; END IF;
  IF v.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'This clip was already paid out'; END IF;

  BEGIN
    rid := regexp_replace(v.request_id, '^db-', '')::uuid;
  EXCEPTION WHEN others THEN
    rid := NULL;
  END;

  IF rid IS NOT NULL THEN
    SELECT * INTO req FROM public.requests WHERE id = rid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bounty not found'; END IF;
    IF req.requester_id <> auth.uid() THEN
      RAISE EXCEPTION 'Only the person who posted this request can accept the clip';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.escrows e
      WHERE e.request_id = rid AND e.status = 'disputed'
    ) THEN
      RAISE EXCEPTION 'This bounty is under review by a moderator. Payment is on hold until the dispute is settled.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.request_id = rid
        AND c.spotter_id = v.uploader_id
        AND c.status IN ('in_progress', 'submitted')
    ) THEN
      RAISE EXCEPTION 'This clip is not attached to the assigned Onlooker';
    END IF;
  END IF;

  fee := ROUND(COALESCE(v.bounty_amount, 0) * 0.15);
  net := ROUND(COALESCE(v.bounty_amount, 0)) - fee;
  IF net > 0 THEN
    PERFORM public.adjust_wallet(v.uploader_id, net, 'bounty_payout', rid, 'Looker Coins earned (after 15% app fee)');
  END IF;

  PERFORM set_config('app.trusted_write', 'on', true);

  UPDATE public.bounty_videos
  SET accepted_at = now(), accepted_by = auth.uid(), payout_amount = net, updated_at = now()
  WHERE id = v.id;

  IF rid IS NOT NULL AND req.id IS NOT NULL THEN
    UPDATE public.escrows
    SET status = 'released', spotter_id = COALESCE(spotter_id, v.uploader_id), updated_at = now()
    WHERE request_id = rid AND status IN ('held', 'reserved', 'submitted');

    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (rid, v.uploader_id, COALESCE(v.bounty_amount, 0), fee);

    UPDATE public.requests
    SET status = 'completed', updated_at = now()
    WHERE id = rid AND status <> 'completed';

    UPDATE public.claims
    SET status = 'approved', updated_at = now()
    WHERE request_id = rid AND spotter_id = v.uploader_id AND status <> 'approved';
  END IF;

  PERFORM public.award_xp(v.uploader_id, 100, 'bounty_completed');
  PERFORM set_config('app.trusted_write', 'off', true);

  RETURN net;
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_bounty_video(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_bounty_video(uuid) TO authenticated, service_role;