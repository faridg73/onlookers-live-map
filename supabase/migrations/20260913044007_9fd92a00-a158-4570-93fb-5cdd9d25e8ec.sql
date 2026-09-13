ALTER TABLE public.payout_requests
  ADD COLUMN IF NOT EXISTS coins_redeemed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS cash_amount_usd numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text;

CREATE OR REPLACE FUNCTION public.request_coin_cashout(_coins integer)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _wallet_id uuid;
  _balance integer;
  _cash numeric;
  _payout_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not signed in';
  END IF;
  IF _coins IS NULL OR _coins < 100 THEN
    RAISE EXCEPTION 'Minimum cash out is 100 Looker Coins';
  END IF;

  _wallet_id := public.ensure_coin_wallet(_uid);

  SELECT coin_balance INTO _balance
  FROM public.user_wallets
  WHERE id = _wallet_id
  FOR UPDATE;

  IF _balance IS NULL OR _balance < _coins THEN
    RAISE EXCEPTION 'Insufficient Coins';
  END IF;

  _cash := round((_coins::numeric / 10.0), 2);

  UPDATE public.user_wallets
  SET coin_balance = coin_balance - _coins,
      updated_at = now()
  WHERE id = _wallet_id;

  INSERT INTO public.payout_requests (user_id, amount, destination, status, note, coins_redeemed, cash_amount_usd)
  VALUES (_uid, _cash, 'stripe_connect', 'pending', format('%s Looker Coins redeemed at 10 coins = $1.00', _coins), _coins, _cash)
  RETURNING id INTO _payout_id;

  INSERT INTO public.coin_transactions (sender_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type)
  VALUES (_wallet_id, _coins, 0, _coins, 'coin_cashout');

  RETURN _payout_id;
END;
$$;

REVOKE ALL ON FUNCTION public.request_coin_cashout(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.request_coin_cashout(integer) TO authenticated;