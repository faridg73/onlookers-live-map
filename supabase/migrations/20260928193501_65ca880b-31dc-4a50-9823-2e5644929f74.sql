REVOKE EXECUTE ON FUNCTION public.mark_payout_method_changed() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.request_credit_cashout(_coins integer)
 RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid(); _wallet_id uuid; _balance numeric; _cash numeric; _payout_id uuid; _today numeric;
  _verified timestamptz; _frozen timestamptz; _fee_charged timestamptz; _country text; _fee numeric := 0;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _coins IS NULL OR _coins < 40 THEN RAISE EXCEPTION 'Minimum cash out is 40 Credits'; END IF;
  IF _coins > 100000 THEN RAISE EXCEPTION 'That is above the single cash-out limit. Please split the request.'; END IF;

  SELECT wallet_balance, payout_identity_verified_at, account_frozen_at, payout_identity_fee_charged_at, payout_country
    INTO _balance, _verified, _frozen, _fee_charged, _country
  FROM public.profiles WHERE id = _uid FOR UPDATE;

  IF _frozen IS NOT NULL THEN RAISE EXCEPTION 'Your account is frozen. Cash-outs are paused.'; END IF;
  IF _verified IS NULL THEN RAISE EXCEPTION 'ID_CHECK_REQUIRED'; END IF;

  PERFORM public.guard_cashout_velocity(_uid);
  PERFORM public.guard_cashout_hold_and_cooldown(_uid, _coins);

  SELECT COALESCE(sum(credits_redeemed), 0) INTO _today FROM public.payout_requests
  WHERE user_id = _uid AND created_at > now() - interval '24 hours';
  IF _today + _coins > 100000 THEN RAISE EXCEPTION 'You have reached the daily cash-out limit. Please try again tomorrow.'; END IF;

  IF _balance IS NULL OR _balance < _coins THEN RAISE EXCEPTION 'Insufficient Credits'; END IF;

  _cash := round((_coins::numeric / 4.0), 2);
  IF _fee_charged IS NULL THEN
    _fee := CASE WHEN upper(coalesce(_country, '')) = 'US' THEN 0.50 ELSE 1.50 END;
    _cash := _cash - _fee;
    UPDATE public.profiles SET payout_identity_fee_charged_at = now() WHERE id = _uid;
  END IF;

  PERFORM public.adjust_wallet(_uid, -_coins, 'credit_cashout', NULL, format('%s Credits redeemed for cash', _coins));

  INSERT INTO public.payout_requests (user_id, amount, destination, status, note, credits_redeemed, cash_amount_usd)
  VALUES (_uid, _coins, 'stripe_connect', 'pending',
    CASE WHEN _fee > 0
      THEN format('%s Credits redeemed at 4 Credits = $1.00, one-time ID check fee $%s deducted', _coins, to_char(_fee, 'FM0.00'))
      ELSE format('%s Credits redeemed at 4 Credits = $1.00', _coins) END,
    _coins, _cash)
  RETURNING id INTO _payout_id;

  _wallet_id := public.ensure_credit_wallet(_uid);
  INSERT INTO public.credit_transactions (sender_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type)
  VALUES (_wallet_id, _coins, 0, _coins, 'credit_cashout');
  RETURN _payout_id;
END;
$function$;