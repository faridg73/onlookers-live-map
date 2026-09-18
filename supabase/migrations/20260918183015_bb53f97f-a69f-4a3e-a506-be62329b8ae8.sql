-- 1. Money tables become read-only for members; all changes go through secured backend logic.
DROP POLICY IF EXISTS "Users can request their own cash-out" ON public.payout_requests;

REVOKE INSERT, UPDATE, DELETE ON public.payout_requests FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.credit_purchases FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.transaction_ledger FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.payout_accounts FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.credit_transactions FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_credit_wallets FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.topups FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.wallet_balances FROM authenticated, anon;
REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM authenticated, anon;

GRANT ALL ON public.payout_requests TO service_role;
GRANT ALL ON public.credit_purchases TO service_role;
GRANT ALL ON public.transaction_ledger TO service_role;
GRANT ALL ON public.payout_accounts TO service_role;
GRANT ALL ON public.credit_transactions TO service_role;
GRANT ALL ON public.user_credit_wallets TO service_role;
GRANT ALL ON public.topups TO service_role;
GRANT ALL ON public.wallet_balances TO service_role;
GRANT ALL ON public.user_wallets TO service_role;

-- 2. Members can never seed or edit balance / trust fields on their own profile row.
CREATE OR REPLACE FUNCTION public.protect_profile_money_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('authenticated', 'anon') THEN
    IF TG_OP = 'INSERT' THEN
      NEW.wallet_balance := 0;
      NEW.legacy_usd_balance := 0;
      NEW.is_verified := false;
      NEW.xp := 0;
      NEW.hunter_level := COALESCE((SELECT 1), 1);
      NEW.warning_count := 0;
      NEW.follower_count := 0;
      NEW.rating := 0;
      NEW.banned_at := NULL;
      NEW.phone_verified_at := NULL;
      NEW.verification_requested_at := NULL;
    ELSE
      NEW.wallet_balance := OLD.wallet_balance;
      NEW.legacy_usd_balance := OLD.legacy_usd_balance;
      NEW.is_verified := OLD.is_verified;
      NEW.xp := OLD.xp;
      NEW.hunter_level := OLD.hunter_level;
      NEW.warning_count := OLD.warning_count;
      NEW.follower_count := OLD.follower_count;
      NEW.rating := OLD.rating;
      NEW.banned_at := OLD.banned_at;
      NEW.phone_verified_at := OLD.phone_verified_at;
      NEW.verification_requested_at := OLD.verification_requested_at;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_profile_money_columns ON public.profiles;
CREATE TRIGGER protect_profile_money_columns
BEFORE INSERT OR UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_money_columns();

-- 3. Velocity guard shared by every cash-out path.
CREATE OR REPLACE FUNCTION public.guard_cashout_velocity(_uid uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _open integer;
  _recent integer;
BEGIN
  IF NOT public.consume_rate_limit('cashout-request', _uid::text, 5, 3600) THEN
    RAISE EXCEPTION 'Too many cash-out requests. Please wait an hour and try again.';
  END IF;

  SELECT count(*) INTO _open
  FROM public.payout_requests
  WHERE user_id = _uid AND status IN ('pending', 'processing');
  IF _open >= 3 THEN
    RAISE EXCEPTION 'You already have cash-out requests under review. Please wait for those to finish.';
  END IF;

  SELECT count(*) INTO _recent
  FROM public.payout_requests
  WHERE user_id = _uid AND created_at > now() - interval '60 seconds';
  IF _recent > 0 THEN
    RAISE EXCEPTION 'That request was just filed. Please wait a moment before trying again.';
  END IF;
END;
$$;

-- 4. Credit cash-out: validated, velocity-checked, atomic.
CREATE OR REPLACE FUNCTION public.request_credit_cashout(_coins integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _wallet_id uuid;
  _balance numeric;
  _cash numeric;
  _payout_id uuid;
  _today numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _coins IS NULL OR _coins < 40 THEN
    RAISE EXCEPTION 'Minimum cash out is 40 Credits';
  END IF;
  IF _coins > 100000 THEN
    RAISE EXCEPTION 'That is above the single cash-out limit. Please split the request.';
  END IF;

  PERFORM public.guard_cashout_velocity(_uid);

  SELECT COALESCE(sum(credits_redeemed), 0) INTO _today
  FROM public.payout_requests
  WHERE user_id = _uid AND created_at > now() - interval '24 hours';
  IF _today + _coins > 100000 THEN
    RAISE EXCEPTION 'You have reached the daily cash-out limit. Please try again tomorrow.';
  END IF;

  SELECT wallet_balance INTO _balance FROM public.profiles WHERE id = _uid FOR UPDATE;
  IF _balance IS NULL OR _balance < _coins THEN RAISE EXCEPTION 'Insufficient Credits'; END IF;

  _cash := round((_coins::numeric / 4.0), 2);
  PERFORM public.adjust_wallet(_uid, -_coins, 'credit_cashout', NULL,
    format('%s Credits redeemed for cash', _coins));

  INSERT INTO public.payout_requests (user_id, amount, destination, status, note, credits_redeemed, cash_amount_usd)
  VALUES (_uid, _coins, 'stripe_connect', 'pending', format('%s Credits redeemed at 4 Credits = $1.00', _coins), _coins, _cash)
  RETURNING id INTO _payout_id;

  _wallet_id := public.ensure_credit_wallet(_uid);
  INSERT INTO public.credit_transactions (sender_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type)
  VALUES (_wallet_id, _coins, 0, _coins, 'credit_cashout');

  RETURN _payout_id;
END;
$function$;

-- 5. Earnings payout: same guardrails.
CREATE OR REPLACE FUNCTION public.request_earnings_payout(_amount numeric, _destination text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _available numeric;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to request a payout';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Enter an amount above zero';
  END IF;
  IF _amount > 25000 THEN
    RAISE EXCEPTION 'That is above the single payout limit. Please split the request.';
  END IF;

  PERFORM public.guard_cashout_velocity(_uid);

  SELECT available_balance INTO _available FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF _available IS NULL OR _available < _amount THEN
    RAISE EXCEPTION 'That is more than your available balance';
  END IF;

  UPDATE public.wallet_balances
  SET available_balance = available_balance - _amount
  WHERE user_id = _uid;

  INSERT INTO public.payout_requests (user_id, amount, destination, status)
  VALUES (_uid, _amount, COALESCE(NULLIF(_destination, ''), 'bank'), 'pending')
  RETURNING id INTO _id;

  RETURN _id;
END;
$function$;

REVOKE ALL ON FUNCTION public.guard_cashout_velocity(uuid) FROM authenticated, anon;
GRANT EXECUTE ON FUNCTION public.guard_cashout_velocity(uuid) TO service_role;