ALTER TABLE public.credit_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_transaction_type_check;

ALTER TABLE public.credit_transactions
  ADD CONSTRAINT credit_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY[
    'bounty_payout','direct_tip','coin_purchase','coin_cashout','credit_purchase','credit_cashout'
  ]));

CREATE OR REPLACE FUNCTION public.credit_purchase(
  _user_id uuid, _session_id text, _package_id text,
  _coins integer, _amount_cents integer, _environment text DEFAULT 'sandbox'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _wallet_id uuid;
  _inserted uuid;
BEGIN
  IF _user_id IS NULL OR _session_id IS NULL OR _coins IS NULL OR _coins <= 0 THEN
    RAISE EXCEPTION 'Invalid credit purchase';
  END IF;

  INSERT INTO public.credit_purchases (
    user_id, session_id, package_id, credits, amount_cents, environment
  ) VALUES (
    _user_id, _session_id, _package_id, _coins, GREATEST(_amount_cents, 0),
    COALESCE(_environment, 'sandbox')
  )
  ON CONFLICT (session_id) DO NOTHING
  RETURNING id INTO _inserted;

  IF _inserted IS NULL THEN
    RETURN false; -- already credited
  END IF;

  PERFORM public.adjust_wallet(_user_id, _coins, 'credit_purchase', NULL,
    format('%s Credits purchased', _coins));

  _wallet_id := public.ensure_credit_wallet(_user_id);

  INSERT INTO public.credit_transactions (
    receiver_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type
  ) VALUES (
    _wallet_id, _coins, 0, _coins, 'credit_purchase'
  );

  RETURN true;
END;
$function$;

CREATE OR REPLACE FUNCTION public.tip_credits(
  _receiver_id uuid, _amount integer,
  _transaction_type text DEFAULT 'direct_tip', _request_id uuid DEFAULT NULL
)
RETURNS TABLE(transaction_id uuid, sender_balance integer, amount_net integer, amount_platform_fee integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _sender_id uuid := auth.uid();
  _sender_wallet uuid;
  _receiver_wallet uuid;
  _sender_balance numeric;
  _fee integer;
  _net integer;
  _tx_id uuid;
BEGIN
  IF _sender_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Invalid amount';
  END IF;
  IF _receiver_id IS NULL OR _receiver_id = _sender_id THEN
    RAISE EXCEPTION 'Invalid recipient';
  END IF;
  IF _transaction_type NOT IN ('bounty_payout', 'direct_tip') THEN
    RAISE EXCEPTION 'Invalid transaction type';
  END IF;

  SELECT wallet_balance INTO _sender_balance
  FROM public.profiles WHERE id = _sender_id FOR UPDATE;

  IF _sender_balance IS NULL OR _sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient Credits' USING ERRCODE = '22003';
  END IF;

  _fee := floor(_amount * 0.20)::integer;
  _net := _amount - _fee;

  _sender_balance := public.adjust_wallet(_sender_id, -_amount, 'tip_sent', _request_id, 'Credits sent');
  PERFORM public.adjust_wallet(_receiver_id, _net, 'tip_received', _request_id, 'Credits received');

  _sender_wallet := public.ensure_credit_wallet(_sender_id);
  _receiver_wallet := public.ensure_credit_wallet(_receiver_id);

  INSERT INTO public.credit_transactions (
    sender_wallet_id, receiver_wallet_id, request_id,
    amount_gross, amount_platform_fee, amount_net, transaction_type
  ) VALUES (
    _sender_wallet, _receiver_wallet, _request_id,
    _amount, _fee, _net, _transaction_type
  ) RETURNING id INTO _tx_id;

  RETURN QUERY SELECT _tx_id, _sender_balance::integer, _net, _fee;
END;
$function$;

CREATE OR REPLACE FUNCTION public.platform_metrics()
RETURNS TABLE(gross_usd numeric, platform_cut_usd numeric, active_pins integer, pending_payouts_usd numeric, expired_clips integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN
    RAISE EXCEPTION 'Only admins can read platform metrics';
  END IF;

  RETURN QUERY
  SELECT
    round(
      coalesce((SELECT sum(amount) FROM public.topups), 0)
      + coalesce((SELECT sum(amount_cents) / 100.0 FROM public.credit_purchases), 0), 2),
    round(
      coalesce((SELECT sum(fee_amount) FROM public.platform_earnings), 0)
      + coalesce((SELECT sum(amount_platform_fee) / 4.0 FROM public.credit_transactions), 0), 2),
    (SELECT count(*)::int FROM public.requests
      WHERE status = 'open' AND expires_at > now()
        AND created_at > now() - interval '24 hours'),
    round(coalesce((SELECT sum(cash_amount_usd) FROM public.payout_requests
      WHERE status IN ('pending', 'requested')), 0), 2),
    (SELECT count(*)::int FROM public.bounty_videos WHERE expired_at IS NOT NULL);
END;
$function$;