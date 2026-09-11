CREATE OR REPLACE FUNCTION public.accept_bounty_video(_video_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v RECORD; fee numeric; net numeric; rid uuid; req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to accept a clip'; END IF;

  SELECT * INTO v FROM public.bounty_videos WHERE id = _video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clip not found'; END IF;
  IF v.uploader_id = auth.uid() THEN RAISE EXCEPTION 'You cannot accept your own clip'; END IF;
  IF v.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'This clip was already paid out'; END IF;

  BEGIN
    rid := v.request_id::uuid;
  EXCEPTION WHEN others THEN
    rid := NULL;
  END;

  IF rid IS NOT NULL THEN
    SELECT * INTO req FROM public.requests WHERE id = rid FOR UPDATE;
    IF FOUND AND req.requester_id <> auth.uid() THEN
      RAISE EXCEPTION 'Only the person who posted this request can accept the clip';
    END IF;
  END IF;

  fee := ROUND(COALESCE(v.bounty_amount, 0) * 0.15, 2);
  net := COALESCE(v.bounty_amount, 0) - fee;
  IF net > 0 THEN
    PERFORM public.adjust_wallet(v.uploader_id, net, 'bounty_payout', rid, 'Bounty earned (after 15% app fee)');
  END IF;

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
    WHERE request_id = rid AND status <> 'approved';
  END IF;

  RETURN net;
END;
$$;

REVOKE ALL ON FUNCTION public.accept_bounty_video(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_bounty_video(uuid) TO authenticated;