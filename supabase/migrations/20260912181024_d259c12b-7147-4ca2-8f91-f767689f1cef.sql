-- 1. Gamification + privacy fields on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS xp integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS hunter_level integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS is_incognito boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS alias text;

-- Stable alias per person so the mask does not change every render.
CREATE OR REPLACE FUNCTION public.build_alias(_user_id uuid)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT (ARRAY['Falcon','Fox','Otter','Heron','Lynx','Raven','Wolf','Panther','Comet','Zebra'])
           [1 + (('x' || substr(md5(_user_id::text), 1, 8))::bit(32)::bigint % 10)]
         || (1 + (('x' || substr(md5(_user_id::text), 9, 8))::bit(32)::bigint % 99))::text;
$$;

UPDATE public.profiles
SET alias = 'Onlooker_' || public.build_alias(id)
WHERE alias IS NULL;

-- 2. Experience points: 100 per completed bounty, a level every 500 points.
CREATE OR REPLACE FUNCTION public.award_xp(_user_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE total integer;
BEGIN
  IF _user_id IS NULL OR COALESCE(_amount, 0) <= 0 THEN RETURN NULL; END IF;
  UPDATE public.profiles
  SET xp = xp + _amount,
      hunter_level = 1 + ((xp + _amount) / 500)
  WHERE id = _user_id
  RETURNING hunter_level INTO total;
  RETURN total;
END;
$$;

-- 3. Tips from bystanders on public clips
CREATE TABLE IF NOT EXISTS public.video_tips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_id uuid NOT NULL REFERENCES public.bounty_videos(id) ON DELETE CASCADE,
  tipper_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.video_tips TO authenticated;
GRANT SELECT ON public.video_tips TO anon;
GRANT ALL ON public.video_tips TO service_role;

ALTER TABLE public.video_tips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tips are visible to everyone"
ON public.video_tips FOR SELECT
USING (true);

CREATE OR REPLACE FUNCTION public.tip_hunter(_video_id uuid, _amount numeric)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v RECORD; amt numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to tip'; END IF;
  amt := ROUND(COALESCE(_amount, 0), 2);
  IF amt <= 0 OR amt > 20 THEN RAISE EXCEPTION 'Tips are between $0.50 and $20'; END IF;

  SELECT * INTO v FROM public.bounty_videos WHERE id = _video_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clip not found'; END IF;
  IF v.uploader_id = auth.uid() THEN RAISE EXCEPTION 'You cannot tip your own clip'; END IF;

  PERFORM public.adjust_wallet(auth.uid(), -amt, 'tip_sent', NULL, 'Tip sent to a reporter');
  PERFORM public.adjust_wallet(v.uploader_id, amt, 'tip_received', NULL, 'Tip from a viewer');

  INSERT INTO public.video_tips (video_id, tipper_id, creator_id, amount)
  VALUES (_video_id, auth.uid(), v.uploader_id, amt);

  RETURN amt;
END;
$$;

-- 4. Instant snippets: filmed at the pin, paid out with no review step.
ALTER TABLE public.bounty_videos
  ADD COLUMN IF NOT EXISTS is_instant boolean NOT NULL DEFAULT false;

CREATE OR REPLACE FUNCTION public.submit_instant_snippet(_video_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v RECORD; rid uuid; fee numeric; net numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;

  SELECT * INTO v FROM public.bounty_videos WHERE id = _video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clip not found'; END IF;
  IF v.uploader_id <> auth.uid() THEN RAISE EXCEPTION 'Only the reporter can submit this clip'; END IF;
  IF v.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'This clip was already paid out'; END IF;

  BEGIN rid := v.request_id::uuid; EXCEPTION WHEN others THEN rid := NULL; END;

  fee := ROUND(COALESCE(v.bounty_amount, 0) * 0.15, 2);
  net := COALESCE(v.bounty_amount, 0) - fee;
  IF net > 0 THEN
    PERFORM public.adjust_wallet(v.uploader_id, net, 'bounty_payout', rid,
      'Instant snippet paid on the spot (after 15% app fee)');
  END IF;

  UPDATE public.bounty_videos
  SET accepted_at = now(), payout_amount = net, is_instant = true, updated_at = now()
  WHERE id = v.id;

  IF rid IS NOT NULL THEN
    UPDATE public.escrows
    SET status = 'released', spotter_id = COALESCE(spotter_id, v.uploader_id), updated_at = now()
    WHERE request_id = rid AND status IN ('held','reserved','submitted');

    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (rid, v.uploader_id, COALESCE(v.bounty_amount, 0), fee);

    UPDATE public.requests SET status = 'completed', updated_at = now()
    WHERE id = rid AND status <> 'completed';

    UPDATE public.claims SET status = 'approved', updated_at = now()
    WHERE request_id = rid AND status <> 'approved';
  END IF;

  PERFORM public.award_xp(v.uploader_id, 100);
  RETURN net;
END;
$$;

-- 5. Award experience when a normal bounty is accepted
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

  PERFORM public.award_xp(v.uploader_id, 100);
  RETURN net;
END;
$$;

-- 6. Public profile card: level, alias and masking, safe for everyone to read
CREATE OR REPLACE FUNCTION public.public_profile_card(_user_id uuid)
RETURNS TABLE(display_name text, avatar_url text, hunter_level integer, xp integer, is_incognito boolean)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    CASE WHEN p.is_incognito THEN COALESCE(p.alias, 'Onlooker_' || public.build_alias(p.id))
         ELSE COALESCE(p.display_name, 'onlooker') END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.avatar_url END,
    p.hunter_level, p.xp, p.is_incognito
  FROM public.profiles p
  WHERE p.id = _user_id;
$$;

-- 7. Global feed of unlocked clips, with tips and creator level
CREATE OR REPLACE FUNCTION public.global_feed_clips(_limit integer DEFAULT 40)
RETURNS TABLE(
  id uuid, request_title text, request_place text, note text, bounty_amount numeric,
  storage_path text, thumb_path text, created_at timestamptz, view_count integer,
  uploader_id uuid, uploader_name text, uploader_avatar text, hunter_level integer,
  tip_total numeric, latitude double precision, longitude double precision
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.id, v.request_title, v.request_place, v.note, v.bounty_amount,
    v.storage_path, v.thumb_path, v.created_at, v.view_count,
    v.uploader_id,
    CASE WHEN p.is_incognito THEN COALESCE(p.alias, 'Onlooker_' || public.build_alias(p.id))
         ELSE COALESCE(p.display_name, 'onlooker') END,
    CASE WHEN p.is_incognito THEN NULL ELSE p.avatar_url END,
    COALESCE(p.hunter_level, 1),
    COALESCE((SELECT SUM(t.amount) FROM public.video_tips t WHERE t.video_id = v.id), 0),
    round(r.latitude::numeric, 2)::double precision,
    round(r.longitude::numeric, 2)::double precision
  FROM public.bounty_videos v
  LEFT JOIN public.profiles p ON p.id = v.uploader_id
  LEFT JOIN public.requests r ON r.id::text = v.request_id
  WHERE v.is_public AND v.accepted_at IS NOT NULL
  ORDER BY v.view_count DESC, v.created_at DESC
  LIMIT LEAST(GREATEST(COALESCE(_limit, 40), 1), 100);
$$;