COMMENT ON COLUMN public.profiles.wallet_balance IS 'Looker Coin balance (whole coins). 4 coins = $1.00 USD.';

CREATE OR REPLACE FUNCTION public.request_coin_cashout(_coins integer)
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
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _coins IS NULL OR _coins < 40 THEN
    RAISE EXCEPTION 'Minimum cash out is 40 Looker Coins';
  END IF;

  SELECT wallet_balance INTO _balance
  FROM public.profiles WHERE id = _uid FOR UPDATE;

  IF _balance IS NULL OR _balance < _coins THEN
    RAISE EXCEPTION 'Insufficient Coins';
  END IF;

  _cash := round((_coins::numeric / 4.0), 2);

  PERFORM public.adjust_wallet(_uid, -_coins, 'coin_cashout', NULL,
    format('%s Looker Coins redeemed for cash', _coins));

  INSERT INTO public.payout_requests (user_id, amount, destination, status, note, coins_redeemed, cash_amount_usd)
  VALUES (_uid, _coins, 'stripe_connect', 'pending', format('%s Looker Coins redeemed at 4 coins = $1.00', _coins), _coins, _cash)
  RETURNING id INTO _payout_id;

  _wallet_id := public.ensure_coin_wallet(_uid);

  INSERT INTO public.coin_transactions (sender_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type)
  VALUES (_wallet_id, _coins, 0, _coins, 'coin_cashout');

  RETURN _payout_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_coin_cashout(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.request_coin_cashout(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.request_cashout(_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE acct RECORD; cid uuid; coins numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to cash out'; END IF;
  coins := ROUND(COALESCE(_amount, 0));
  IF coins < 40 THEN RAISE EXCEPTION 'Minimum cash out is 40 Looker Coins'; END IF;

  SELECT * INTO acct FROM public.payout_accounts WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT acct.payouts_enabled THEN
    RAISE EXCEPTION 'Connect a bank account before cashing out';
  END IF;

  PERFORM public.adjust_wallet(auth.uid(), -coins, 'cashout', NULL, 'Looker Coins cashed out to bank account');

  INSERT INTO public.cashouts (user_id, amount, environment)
  VALUES (auth.uid(), coins, acct.environment)
  RETURNING id INTO cid;

  RETURN cid;
END;
$function$;

REVOKE ALL ON FUNCTION public.request_cashout(numeric) FROM public;
GRANT EXECUTE ON FUNCTION public.request_cashout(numeric) TO authenticated;

CREATE OR REPLACE FUNCTION public.platform_metrics()
RETURNS TABLE (
  gross_usd numeric,
  platform_cut_usd numeric,
  active_pins integer,
  pending_payouts_usd numeric,
  expired_clips integer
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can read platform metrics';
  END IF;

  RETURN QUERY
  SELECT
    round(
      coalesce((SELECT sum(amount) FROM public.topups), 0)
      + coalesce((SELECT sum(amount_cents) / 100.0 FROM public.coin_purchases), 0), 2),
    round(
      coalesce((SELECT sum(fee_amount) FROM public.platform_earnings), 0)
      + coalesce((SELECT sum(amount_platform_fee) / 4.0 FROM public.coin_transactions), 0), 2),
    (SELECT count(*)::int FROM public.requests
      WHERE status = 'open' AND expires_at > now()
        AND created_at > now() - interval '24 hours'),
    round(coalesce((SELECT sum(cash_amount_usd) FROM public.payout_requests
      WHERE status IN ('pending', 'requested')), 0), 2),
    (SELECT count(*)::int FROM public.bounty_videos WHERE expired_at IS NOT NULL);
END;
$$;

REVOKE ALL ON FUNCTION public.platform_metrics() FROM anon;
GRANT EXECUTE ON FUNCTION public.platform_metrics() TO authenticated;