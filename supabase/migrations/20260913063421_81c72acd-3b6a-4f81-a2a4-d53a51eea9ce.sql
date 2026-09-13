ALTER TABLE public.user_wallets RENAME TO user_credit_wallets;
ALTER TABLE public.user_credit_wallets RENAME COLUMN coin_balance TO credit_balance;
ALTER TABLE public.coin_transactions RENAME TO credit_transactions;
ALTER TABLE public.coin_purchases RENAME TO credit_purchases;
ALTER TABLE public.credit_purchases RENAME COLUMN coins TO credits;
ALTER TABLE public.payout_requests RENAME COLUMN coins_redeemed TO credits_redeemed;

ALTER FUNCTION public.ensure_coin_wallet(uuid) RENAME TO ensure_credit_wallet;
ALTER FUNCTION public.tip_coins(uuid, integer, text, uuid) RENAME TO tip_credits;
ALTER FUNCTION public.request_coin_cashout(integer) RENAME TO request_credit_cashout;
ALTER FUNCTION public.credit_coin_purchase(uuid, text, text, integer, integer, text) RENAME TO credit_purchase;

COMMENT ON TABLE public.user_credit_wallets IS 'Canonical wallet balances denominated in Credits.';
COMMENT ON COLUMN public.user_credit_wallets.credit_balance IS 'Whole Credits. 4 Credits = $1.00 USD.';
COMMENT ON TABLE public.credit_transactions IS 'Canonical ledger of Credit transfers, rewards, purchases, tips, and cash-outs.';
COMMENT ON TABLE public.credit_purchases IS 'Completed card purchases of Credits.';
COMMENT ON COLUMN public.credit_purchases.credits IS 'Whole Credits purchased at the platform rate.';
COMMENT ON COLUMN public.profiles.wallet_balance IS 'Credit balance in whole Credits. 4 Credits = $1.00 USD.';
COMMENT ON COLUMN public.payout_requests.credits_redeemed IS 'Whole Credits redeemed for the cash payout.';

CREATE OR REPLACE FUNCTION public.adjust_wallet(_user_id uuid, _amount numeric, _kind text, _request_id uuid, _note text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_balance numeric; credits numeric;
BEGIN
  credits := ROUND(COALESCE(_amount, 0));

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + credits
  WHERE id = _user_id
  RETURNING wallet_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Credits';
  END IF;

  INSERT INTO public.user_credit_wallets (user_id, credit_balance)
  VALUES (_user_id, new_balance::integer)
  ON CONFLICT (user_id) DO UPDATE
    SET credit_balance = new_balance::integer, updated_at = now();

  INSERT INTO public.wallet_transactions (user_id, request_id, kind, amount, balance_after, note)
  VALUES (_user_id, _request_id, _kind, credits, new_balance, COALESCE(_note, ''));

  RETURN new_balance;
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_coin_wallet(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.ensure_credit_wallet(_user_id)
$function$;

CREATE OR REPLACE FUNCTION public.tip_coins(_receiver_id uuid, _amount integer, _transaction_type text DEFAULT 'direct_tip'::text, _request_id uuid DEFAULT NULL::uuid)
RETURNS TABLE(transaction_id uuid, sender_balance integer, amount_net integer, amount_platform_fee integer)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT * FROM public.tip_credits(_receiver_id, _amount, _transaction_type, _request_id)
$function$;

CREATE OR REPLACE FUNCTION public.request_coin_cashout(_coins integer)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.request_credit_cashout(_coins)
$function$;

CREATE OR REPLACE FUNCTION public.credit_coin_purchase(_user_id uuid, _session_id text, _package_id text, _coins integer, _amount_cents integer, _environment text DEFAULT 'sandbox'::text)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT public.credit_purchase(_user_id, _session_id, _package_id, _coins, _amount_cents, _environment)
$function$;

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
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not signed in'; END IF;
  IF _coins IS NULL OR _coins < 40 THEN
    RAISE EXCEPTION 'Minimum cash out is 40 Credits';
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

REVOKE ALL ON FUNCTION public.ensure_coin_wallet(uuid) FROM public;
REVOKE ALL ON FUNCTION public.tip_coins(uuid, integer, text, uuid) FROM public;
REVOKE ALL ON FUNCTION public.request_coin_cashout(integer) FROM public;
REVOKE ALL ON FUNCTION public.credit_coin_purchase(uuid, text, text, integer, integer, text) FROM public;
REVOKE ALL ON FUNCTION public.request_credit_cashout(integer) FROM public;
GRANT EXECUTE ON FUNCTION public.ensure_coin_wallet(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tip_coins(uuid, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_coin_cashout(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.credit_coin_purchase(uuid, text, text, integer, integer, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.request_credit_cashout(integer) TO authenticated;