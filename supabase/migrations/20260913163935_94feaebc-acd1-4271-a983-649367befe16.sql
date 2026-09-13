-- ============ Community Discover hub ============
CREATE TABLE public.community_posts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  place text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  media_path text,
  media_url text,
  aspect text NOT NULL DEFAULT '16:9',
  is_flash boolean NOT NULL DEFAULT false,
  expires_at timestamp with time zone,
  pinned_until timestamp with time zone,
  pinned_credits integer NOT NULL DEFAULT 0,
  view_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.community_posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
GRANT ALL ON public.community_posts TO service_role;

ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live community posts are public"
ON public.community_posts FOR SELECT TO anon, authenticated
USING (expires_at IS NULL OR expires_at > now());

CREATE POLICY "Authors can read their own posts"
ON public.community_posts FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Authors create their own posts"
ON public.community_posts FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors update their own posts"
ON public.community_posts FOR UPDATE TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Authors delete their own posts"
ON public.community_posts FOR DELETE TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX community_posts_category_idx ON public.community_posts (category, created_at DESC);
CREATE INDEX community_posts_expiry_idx ON public.community_posts (expires_at);

CREATE TRIGGER update_community_posts_updated_at
BEFORE UPDATE ON public.community_posts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Pay-per-minute live streaming ============
CREATE TABLE public.stream_sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES public.community_posts(id) ON DELETE SET NULL,
  credits_per_minute integer NOT NULL DEFAULT 4,
  minutes_billed integer NOT NULL DEFAULT 0,
  credits_spent integer NOT NULL DEFAULT 0,
  credits_earned integer NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'live',
  started_at timestamp with time zone NOT NULL DEFAULT now(),
  ended_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.stream_sessions TO authenticated;
GRANT ALL ON public.stream_sessions TO service_role;

ALTER TABLE public.stream_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Host and viewer see their sessions"
ON public.stream_sessions FOR SELECT TO authenticated
USING (auth.uid() = host_id OR auth.uid() = viewer_id);

CREATE TRIGGER update_stream_sessions_updated_at
BEFORE UPDATE ON public.stream_sessions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============ Pin a Discover post with Credits ============
CREATE OR REPLACE FUNCTION public.pin_community_post(_post_id uuid, _credits integer, _hours integer DEFAULT 6)
RETURNS timestamp with time zone
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _owner uuid;
  _until timestamp with time zone;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF _credits IS NULL OR _credits < 4 THEN RAISE EXCEPTION 'Boosting costs at least 4 Credits.'; END IF;

  SELECT user_id INTO _owner FROM public.community_posts WHERE id = _post_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'That post no longer exists.'; END IF;
  IF _owner <> _uid THEN RAISE EXCEPTION 'You can only boost your own post.'; END IF;

  PERFORM public.adjust_wallet(_uid, -_credits, 'post_boost', NULL,
    format('%s Credits to boost a Discover post', _credits));

  _until := greatest(now(), coalesce((SELECT pinned_until FROM public.community_posts WHERE id = _post_id), now()))
            + make_interval(hours => greatest(1, coalesce(_hours, 6)));

  UPDATE public.community_posts
  SET pinned_until = _until,
      pinned_credits = pinned_credits + _credits
  WHERE id = _post_id;

  RETURN _until;
END;
$$;

REVOKE ALL ON FUNCTION public.pin_community_post(uuid, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pin_community_post(uuid, integer, integer) TO authenticated;

-- ============ Start a paid live session ============
CREATE OR REPLACE FUNCTION public.start_stream_session(_host_id uuid, _credits_per_minute integer DEFAULT 4, _post_id uuid DEFAULT NULL)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF _host_id = _uid THEN RAISE EXCEPTION 'You cannot pay to watch your own stream.'; END IF;
  IF _credits_per_minute IS NULL OR _credits_per_minute < 1 THEN
    RAISE EXCEPTION 'A live session costs at least 1 Credit per minute.';
  END IF;

  INSERT INTO public.stream_sessions (host_id, viewer_id, post_id, credits_per_minute)
  VALUES (_host_id, _uid, _post_id, _credits_per_minute)
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.start_stream_session(uuid, integer, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.start_stream_session(uuid, integer, uuid) TO authenticated;

-- ============ Charge one minute of a live session ============
CREATE OR REPLACE FUNCTION public.bill_stream_minute(_session_id uuid)
RETURNS TABLE(minutes_billed integer, credits_spent integer, host_earned integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.stream_sessions;
  _rate integer;
  _fee integer;
  _net integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;

  SELECT * INTO _row FROM public.stream_sessions WHERE id = _session_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'That live session no longer exists.'; END IF;
  IF _row.viewer_id <> _uid THEN RAISE EXCEPTION 'Only the viewer can be charged for this session.'; END IF;
  IF _row.status <> 'live' THEN RAISE EXCEPTION 'This live session has ended.'; END IF;

  _rate := _row.credits_per_minute;
  _fee := floor(_rate * 0.2);
  _net := _rate - _fee;

  PERFORM public.adjust_wallet(_uid, -_rate, 'stream_minute', NULL,
    format('%s Credits for a minute of live video', _rate));
  PERFORM public.adjust_wallet(_row.host_id, _net, 'stream_earning', NULL,
    format('%s Credits earned streaming live', _net));

  INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
  VALUES (NULL, _row.host_id, _rate, _fee);

  UPDATE public.stream_sessions
  SET minutes_billed = minutes_billed + 1,
      credits_spent = credits_spent + _rate,
      credits_earned = credits_earned + _net
  WHERE id = _session_id
  RETURNING stream_sessions.minutes_billed, stream_sessions.credits_spent, stream_sessions.credits_earned
  INTO minutes_billed, credits_spent, host_earned;

  RETURN NEXT;
END;
$$;

REVOKE ALL ON FUNCTION public.bill_stream_minute(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bill_stream_minute(uuid) TO authenticated;

-- ============ End a live session ============
CREATE OR REPLACE FUNCTION public.end_stream_session(_session_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;

  UPDATE public.stream_sessions
  SET status = 'ended', ended_at = now()
  WHERE id = _session_id AND status = 'live' AND (viewer_id = _uid OR host_id = _uid);

  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.end_stream_session(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.end_stream_session(uuid) TO authenticated;