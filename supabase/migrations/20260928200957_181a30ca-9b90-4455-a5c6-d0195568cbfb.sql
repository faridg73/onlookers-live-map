CREATE OR REPLACE FUNCTION public.payout_cooldown_interval(_uid uuid)
RETURNS interval LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  -- Test-mode (sandbox) payout accounts only move fake money, so they get a 2-minute wait for testing.
  SELECT CASE WHEN EXISTS (SELECT 1 FROM public.payout_accounts WHERE user_id = _uid AND environment = 'sandbox')
    THEN interval '2 minutes' ELSE interval '24 hours' END;
$$;
REVOKE EXECUTE ON FUNCTION public.payout_cooldown_interval(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.my_cashout_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _bal numeric; _changed timestamptz; _held int; _next timestamptz; _wait interval; _frozen timestamptz;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT wallet_balance, payout_method_changed_at, account_frozen_at INTO _bal, _changed, _frozen FROM public.profiles WHERE id = _uid;
  _wait := public.payout_cooldown_interval(_uid);
  _held := LEAST(public.credits_on_hold(_uid), COALESCE(_bal,0)::int);
  SELECT min(ct.available_at) INTO _next FROM public.credit_transactions ct
    JOIN public.user_credit_wallets w ON w.id = ct.receiver_wallet_id
    WHERE w.user_id = _uid AND ct.available_at > now();
  RETURN jsonb_build_object(
    'balance', COALESCE(_bal,0), 'on_hold', _held,
    'available', GREATEST(COALESCE(_bal,0)::int - _held, 0),
    'next_release_at', _next,
    'frozen_at', _frozen,
    'test_mode', _wait < interval '1 hour',
    'cooldown_until', CASE WHEN _changed > now() - _wait THEN _changed + _wait END);
END $$;
REVOKE EXECUTE ON FUNCTION public.my_cashout_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cashout_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.guard_cashout_hold_and_cooldown(_uid uuid, _coins integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal numeric; _changed timestamptz; _held int;
BEGIN
  SELECT wallet_balance, payout_method_changed_at INTO _bal, _changed FROM public.profiles WHERE id = _uid;
  IF _changed > now() - public.payout_cooldown_interval(_uid) THEN
    RAISE EXCEPTION 'PAYOUT_COOLDOWN';
  END IF;
  _held := public.credits_on_hold(_uid);
  IF COALESCE(_bal,0) - _held < _coins THEN
    RAISE EXCEPTION 'ON_HOLD';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_cashout_hold_and_cooldown(uuid, integer) FROM PUBLIC, anon, authenticated;

-- Frozen accounts can't file earnings payouts either.
CREATE OR REPLACE FUNCTION public.request_earnings_payout(_amount numeric, _destination text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $function$
DECLARE _uid uuid := auth.uid(); _available numeric; _id uuid;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in to request a payout'; END IF;
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND account_frozen_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Your account is frozen. Cash-outs are paused.';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Enter an amount above zero'; END IF;
  IF _amount > 25000 THEN RAISE EXCEPTION 'That is above the single payout limit. Please split the request.'; END IF;
  PERFORM public.guard_cashout_velocity(_uid);
  SELECT available_balance INTO _available FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF _available IS NULL OR _available < _amount THEN RAISE EXCEPTION 'That is more than your available balance'; END IF;
  UPDATE public.wallet_balances SET available_balance = available_balance - _amount WHERE user_id = _uid;
  INSERT INTO public.payout_requests (user_id, amount, destination, status)
  VALUES (_uid, _amount, COALESCE(NULLIF(_destination, ''), 'bank'), 'pending') RETURNING id INTO _id;
  RETURN _id;
END;
$function$;