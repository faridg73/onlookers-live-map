CREATE OR REPLACE FUNCTION public.tip_credits(_receiver_id uuid, _amount integer, _transaction_type text DEFAULT 'direct_tip'::text, _request_id uuid DEFAULT NULL::uuid)
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

  -- Resolve wallets directly: ensure_credit_wallet() rejects any id other than
  -- auth.uid(), which made every peer-to-peer tip fail with "Not authorized".
  INSERT INTO public.user_credit_wallets (user_id)
  VALUES (_sender_id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_credit_wallets (user_id)
  VALUES (_receiver_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO _sender_wallet FROM public.user_credit_wallets WHERE user_id = _sender_id;
  SELECT id INTO _receiver_wallet FROM public.user_credit_wallets WHERE user_id = _receiver_id;

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

CREATE OR REPLACE FUNCTION public.tip_hunter(_video_id uuid, _amount numeric)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v RECORD; amt numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to tip'; END IF;
  amt := ROUND(COALESCE(_amount, 0));
  IF amt < 1 OR amt > 200 THEN RAISE EXCEPTION 'Tips are between 1 and 200 Credits'; END IF;

  SELECT * INTO v FROM public.bounty_videos WHERE id = _video_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clip not found'; END IF;
  IF v.uploader_id = auth.uid() THEN RAISE EXCEPTION 'You cannot tip your own clip'; END IF;

  PERFORM public.adjust_wallet(auth.uid(), -amt, 'tip_sent', NULL, 'Tip sent to a reporter');
  PERFORM public.adjust_wallet(v.uploader_id, amt, 'tip_received', NULL, 'Tip from a viewer');

  INSERT INTO public.video_tips (video_id, tipper_id, creator_id, amount)
  VALUES (_video_id, auth.uid(), v.uploader_id, amt);

  RETURN amt;
END;
$function$;

GRANT EXECUTE ON FUNCTION public.tip_credits(uuid, integer, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.tip_hunter(uuid, numeric) TO authenticated;