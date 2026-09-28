ALTER TABLE public.wallet_transactions DROP CONSTRAINT wallet_transactions_kind_check;
ALTER TABLE public.wallet_transactions ADD CONSTRAINT wallet_transactions_kind_check CHECK (kind = ANY (ARRAY['topup','escrow_hold','escrow_refund','bounty_payout','withdrawal','credit_purchase','tip_sent','tip_received','credit_cashout','cashout','cashout_refund','post_boost','stream_minute','stream_earning','pool_contribution','streak_reward','balance_correction']));

CREATE OR REPLACE FUNCTION public.contribute_to_pool(_pool_id uuid, _amount integer)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _pooled integer; _status text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF _amount < 1 THEN RAISE EXCEPTION 'Chip in at least 1 Credit.'; END IF;
  SELECT status INTO _status FROM public.bounty_pools WHERE id = _pool_id FOR UPDATE;
  IF _status IS NULL THEN RAISE EXCEPTION 'That pool no longer exists.'; END IF;
  IF _status <> 'open' THEN RAISE EXCEPTION 'That pool is closed.'; END IF;
  -- Deducts the real balance (raises Insufficient Credits if short).
  PERFORM public.adjust_wallet(_uid, -_amount, 'pool_contribution', NULL, 'Chipped in to a group bounty');
  INSERT INTO public.pool_contributions (pool_id, user_id, amount) VALUES (_pool_id, _uid, _amount);
  PERFORM set_config('app.pool_ledger', 'on', true);
  UPDATE public.bounty_pools
     SET pooled_credits = pooled_credits + _amount,
         status = CASE WHEN pooled_credits + _amount >= goal_credits THEN 'funded' ELSE status END
   WHERE id = _pool_id RETURNING pooled_credits INTO _pooled;
  PERFORM set_config('app.pool_ledger', 'off', true);
  RETURN _pooled;
END $$;

CREATE OR REPLACE FUNCTION public.record_daily_engagement()
RETURNS TABLE(current_streak integer, longest_streak integer, boost_passes integer, awarded_credits integer, awarded_pass boolean, already_checked_in boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _row public.engagement_streaks; _today date := (now() AT TIME ZONE 'utc')::date;
  _credits integer := 0; _pass boolean := false; _seen boolean := false;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  INSERT INTO public.engagement_streaks (user_id) VALUES (_uid) ON CONFLICT (user_id) DO NOTHING;
  SELECT * INTO _row FROM public.engagement_streaks WHERE user_id = _uid FOR UPDATE;
  IF _row.last_active_on = _today THEN
    _seen := true;
  ELSE
    IF _row.last_active_on = _today - 1 THEN _row.current_streak := _row.current_streak + 1; ELSE _row.current_streak := 1; END IF;
    _row.total_days := _row.total_days + 1;
    _row.longest_streak := GREATEST(_row.longest_streak, _row.current_streak);
    _row.last_active_on := _today;
    _credits := CASE WHEN _row.current_streak % 30 = 0 THEN 25 WHEN _row.current_streak % 14 = 0 THEN 10
      WHEN _row.current_streak % 7 = 0 THEN 5 WHEN _row.current_streak % 3 = 0 THEN 2 ELSE 0 END;
    _pass := (_row.current_streak % 7 = 0);
    UPDATE public.engagement_streaks AS s SET current_streak = _row.current_streak, longest_streak = _row.longest_streak,
      total_days = _row.total_days, last_active_on = _row.last_active_on,
      boost_passes = s.boost_passes + CASE WHEN _pass THEN 1 ELSE 0 END,
      reward_credits_total = s.reward_credits_total + _credits
    WHERE s.user_id = _uid RETURNING s.* INTO _row;
    IF _credits > 0 THEN
      PERFORM public.adjust_wallet(_uid, _credits, 'streak_reward', NULL, 'Daily streak reward');
    END IF;
  END IF;
  RETURN QUERY SELECT _row.current_streak, _row.longest_streak, _row.boost_passes, _credits, _pass, _seen;
END $$;

-- Correct the one test escrow hold that was never deducted but was later refunded.
SELECT public.adjust_wallet('ab0019bd-850b-403f-813b-9405a0a3c9ac', -40, 'balance_correction', NULL, 'Correction: earlier bounty hold that was not deducted');