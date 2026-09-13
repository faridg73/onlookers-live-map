-- 1. Daily engagement streaks -------------------------------------------------
CREATE TABLE public.engagement_streaks (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  total_days integer NOT NULL DEFAULT 0,
  last_active_on date,
  boost_passes integer NOT NULL DEFAULT 0,
  reward_credits_total integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.engagement_streaks TO authenticated;
GRANT ALL ON public.engagement_streaks TO service_role;

ALTER TABLE public.engagement_streaks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members read their own streak" ON public.engagement_streaks
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER update_engagement_streaks_updated_at
  BEFORE UPDATE ON public.engagement_streaks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Milestone rewards: credits + free post-boost passes.
CREATE OR REPLACE FUNCTION public.record_daily_engagement()
RETURNS TABLE(current_streak integer, longest_streak integer, boost_passes integer,
              awarded_credits integer, awarded_pass boolean, already_checked_in boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _row public.engagement_streaks;
  _today date := (now() AT TIME ZONE 'utc')::date;
  _credits integer := 0;
  _pass boolean := false;
  _seen boolean := false;
  _wallet uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'You must be signed in.';
  END IF;

  INSERT INTO public.engagement_streaks (user_id)
  VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT * INTO _row FROM public.engagement_streaks WHERE user_id = _uid FOR UPDATE;

  IF _row.last_active_on = _today THEN
    _seen := true;
  ELSE
    IF _row.last_active_on = _today - 1 THEN
      _row.current_streak := _row.current_streak + 1;
    ELSE
      _row.current_streak := 1;
    END IF;
    _row.total_days := _row.total_days + 1;
    _row.longest_streak := GREATEST(_row.longest_streak, _row.current_streak);
    _row.last_active_on := _today;

    _credits := CASE
      WHEN _row.current_streak % 30 = 0 THEN 25
      WHEN _row.current_streak % 14 = 0 THEN 10
      WHEN _row.current_streak % 7 = 0 THEN 5
      WHEN _row.current_streak % 3 = 0 THEN 2
      ELSE 0 END;
    _pass := (_row.current_streak % 7 = 0);

    UPDATE public.engagement_streaks SET
      current_streak = _row.current_streak,
      longest_streak = _row.longest_streak,
      total_days = _row.total_days,
      last_active_on = _row.last_active_on,
      boost_passes = boost_passes + CASE WHEN _pass THEN 1 ELSE 0 END,
      reward_credits_total = reward_credits_total + _credits
    WHERE user_id = _uid
    RETURNING * INTO _row;

    IF _credits > 0 THEN
      _wallet := public.ensure_credit_wallet(_uid);
      UPDATE public.user_credit_wallets
        SET credit_balance = credit_balance + _credits, updated_at = now()
        WHERE id = _wallet;
    END IF;
  END IF;

  RETURN QUERY SELECT _row.current_streak, _row.longest_streak, _row.boost_passes,
                      _credits, _pass, _seen;
END;
$$;

REVOKE ALL ON FUNCTION public.record_daily_engagement() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_daily_engagement() TO authenticated;

-- 2. Group Pools ---------------------------------------------------------------
CREATE TABLE public.bounty_pools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  place text NOT NULL DEFAULT '',
  latitude double precision,
  longitude double precision,
  goal_credits integer NOT NULL,
  pooled_credits integer NOT NULL DEFAULT 0,
  kind text NOT NULL DEFAULT 'bounty',
  status text NOT NULL DEFAULT 'open',
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE ON public.bounty_pools TO authenticated;
GRANT ALL ON public.bounty_pools TO service_role;

ALTER TABLE public.bounty_pools ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can see pools" ON public.bounty_pools
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Members create their own pools" ON public.bounty_pools
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = creator_id);
CREATE POLICY "Creators update their own pools" ON public.bounty_pools
  FOR UPDATE TO authenticated USING (auth.uid() = creator_id) WITH CHECK (auth.uid() = creator_id);

CREATE TRIGGER update_bounty_pools_updated_at
  BEFORE UPDATE ON public.bounty_pools
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.pool_contributions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pool_id uuid NOT NULL REFERENCES public.bounty_pools(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.pool_contributions TO authenticated;
GRANT ALL ON public.pool_contributions TO service_role;

ALTER TABLE public.pool_contributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Signed-in members can see contributions" ON public.pool_contributions
  FOR SELECT TO authenticated USING (true);

CREATE INDEX pool_contributions_pool_idx ON public.pool_contributions (pool_id);

CREATE OR REPLACE FUNCTION public.create_bounty_pool(
  _title text, _place text, _goal_credits integer, _kind text,
  _latitude double precision DEFAULT NULL, _longitude double precision DEFAULT NULL,
  _hours integer DEFAULT 24
)
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
  IF coalesce(trim(_title), '') = '' THEN RAISE EXCEPTION 'Give the pool a title.'; END IF;
  IF _goal_credits < 20 THEN RAISE EXCEPTION 'The goal must be at least 20 Credits.'; END IF;
  IF _kind NOT IN ('bounty', 'meetup') THEN RAISE EXCEPTION 'Unknown pool type.'; END IF;

  INSERT INTO public.bounty_pools (creator_id, title, place, latitude, longitude,
                                   goal_credits, kind, expires_at)
  VALUES (_uid, trim(_title), coalesce(trim(_place), ''), _latitude, _longitude,
          _goal_credits, _kind, now() + make_interval(hours => greatest(_hours, 1)))
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;

REVOKE ALL ON FUNCTION public.create_bounty_pool(text, text, integer, text, double precision, double precision, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_bounty_pool(text, text, integer, text, double precision, double precision, integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.contribute_to_pool(_pool_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _wallet uuid;
  _balance integer;
  _pooled integer;
  _status text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF _amount < 1 THEN RAISE EXCEPTION 'Chip in at least 1 Credit.'; END IF;

  SELECT status INTO _status FROM public.bounty_pools WHERE id = _pool_id FOR UPDATE;
  IF _status IS NULL THEN RAISE EXCEPTION 'That pool no longer exists.'; END IF;
  IF _status <> 'open' THEN RAISE EXCEPTION 'That pool is closed.'; END IF;

  _wallet := public.ensure_credit_wallet(_uid);
  SELECT credit_balance INTO _balance FROM public.user_credit_wallets WHERE id = _wallet FOR UPDATE;
  IF _balance < _amount THEN RAISE EXCEPTION 'Insufficient Credits'; END IF;

  UPDATE public.user_credit_wallets
    SET credit_balance = credit_balance - _amount, updated_at = now()
    WHERE id = _wallet;

  INSERT INTO public.pool_contributions (pool_id, user_id, amount)
  VALUES (_pool_id, _uid, _amount);

  UPDATE public.bounty_pools
    SET pooled_credits = pooled_credits + _amount,
        status = CASE WHEN pooled_credits + _amount >= goal_credits THEN 'funded' ELSE status END
    WHERE id = _pool_id
    RETURNING pooled_credits INTO _pooled;

  RETURN _pooled;
END;
$$;

REVOKE ALL ON FUNCTION public.contribute_to_pool(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.contribute_to_pool(uuid, integer) TO authenticated;