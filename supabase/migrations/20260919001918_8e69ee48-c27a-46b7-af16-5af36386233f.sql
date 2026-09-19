CREATE OR REPLACE FUNCTION public.record_daily_engagement()
RETURNS TABLE(current_streak integer, longest_streak integer, boost_passes integer, awarded_credits integer, awarded_pass boolean, already_checked_in boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

    UPDATE public.engagement_streaks AS s SET
      current_streak = _row.current_streak,
      longest_streak = _row.longest_streak,
      total_days = _row.total_days,
      last_active_on = _row.last_active_on,
      boost_passes = s.boost_passes + CASE WHEN _pass THEN 1 ELSE 0 END,
      reward_credits_total = s.reward_credits_total + _credits
    WHERE s.user_id = _uid
    RETURNING s.* INTO _row;

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
$function$;

REVOKE ALL ON FUNCTION public.record_daily_engagement() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_daily_engagement() TO authenticated, service_role;