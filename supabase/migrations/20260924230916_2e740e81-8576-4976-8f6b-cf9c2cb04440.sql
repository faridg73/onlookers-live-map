CREATE OR REPLACE FUNCTION public.enforce_claim_update_rules()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE
  old_j jsonb;
  new_j jsonb;
BEGIN
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;

  IF public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  old_j := (to_jsonb(OLD) - 'status' - 'updated_at');
  new_j := (to_jsonb(NEW) - 'status' - 'updated_at');
  IF old_j IS DISTINCT FROM new_j THEN
    RAISE EXCEPTION 'Only the claim status may be changed';
  END IF;

  IF auth.uid() = OLD.spotter_id THEN
    IF OLD.status = 'in_progress' AND NEW.status IN ('in_progress', 'submitted') THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'A spotter can only submit an in-progress claim';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.requests r
    WHERE r.id = OLD.request_id AND r.requester_id = auth.uid()
  ) THEN
    IF OLD.status = 'submitted' AND NEW.status = 'approved' THEN
      RETURN NEW;
    END IF;
    RAISE EXCEPTION 'A requester can only approve a submitted claim';
  END IF;

  RAISE EXCEPTION 'You cannot update this claim';
END;
$function$;

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
    WHERE request_id = rid
      AND spotter_id = v.uploader_id
      AND status IN ('in_progress', 'submitted');
  END IF;

  PERFORM set_config('app.trusted_write', 'off', true);
  PERFORM public.award_xp(v.uploader_id, 100);
  RETURN net;
END;
$function$;

REVOKE ALL ON FUNCTION public.accept_bounty_video(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.accept_bounty_video(uuid) TO authenticated, service_role;