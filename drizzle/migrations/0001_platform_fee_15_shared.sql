CREATE OR REPLACE FUNCTION public.platform_fee_rate()
RETURNS numeric LANGUAGE sql IMMUTABLE SET search_path = public AS $$ SELECT 0.15::numeric $$;
GRANT EXECUTE ON FUNCTION public.platform_fee_rate() TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.award_bounty_bid(_bid_id uuid)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _b record; _req record; _fee integer; _net integer; _other record;
BEGIN
  SELECT * INTO _b FROM public.bounty_bids WHERE id = _bid_id AND status = 'active' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Bid not found'; END IF;
  SELECT id, requester_id, status, expires_at INTO _req FROM public.requests WHERE id = _b.request_id FOR UPDATE;
  IF _req.requester_id IS DISTINCT FROM auth.uid() THEN RAISE EXCEPTION 'Only the Poster can choose the winner'; END IF;
  IF _req.status <> 'open' OR _req.expires_at <= now() THEN RAISE EXCEPTION 'This bounty is no longer open'; END IF;

  UPDATE public.bounty_bids SET status = 'won' WHERE id = _b.id;
  _fee := ROUND(_b.amount * public.platform_fee_rate());
  _net := _b.amount - _fee;
  IF _net > 0 THEN
    PERFORM public.adjust_wallet(_req.requester_id, _net, 'bid_winning', _req.id,
      format('Winning bid of %s credits (after 15%% fee)', _b.amount));
  END IF;
  INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
  VALUES (_req.id, _b.bidder_id, _b.amount, _fee);

  FOR _other IN SELECT * FROM public.bounty_bids WHERE request_id = _req.id AND status = 'active' FOR UPDATE LOOP
    UPDATE public.bounty_bids SET status = 'refunded' WHERE id = _other.id;
    PERFORM public.adjust_wallet(_other.bidder_id, _other.amount, 'bid_refund', _req.id, 'Another Onlooker was chosen — credits returned');
  END LOOP;

  PERFORM set_config('app.bid_award', 'on', true);
  INSERT INTO public.claims (request_id, spotter_id) VALUES (_req.id, _b.bidder_id);
  PERFORM set_config('app.bid_award', 'off', true);
END; $function$;

CREATE OR REPLACE FUNCTION public.bill_stream_minute(_session_id uuid)
 RETURNS TABLE(minutes_billed integer, credits_spent integer, host_earned integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _uid uuid := auth.uid(); _row public.stream_sessions; _rate integer; _fee integer; _net integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  SELECT * INTO _row FROM public.stream_sessions WHERE id = _session_id;
  IF _row.id IS NULL THEN RAISE EXCEPTION 'That live session no longer exists.'; END IF;
  IF _row.viewer_id <> _uid THEN RAISE EXCEPTION 'Only the viewer can be charged for this session.'; END IF;
  IF _row.status <> 'live' THEN RAISE EXCEPTION 'This live session has ended.'; END IF;

  _rate := _row.credits_per_minute;
  _fee := ROUND(_rate * public.platform_fee_rate());
  _net := _rate - _fee;

  PERFORM public.adjust_wallet(_uid, -_rate, 'stream_minute', NULL, format('%s Credits for a minute of live video', _rate));
  PERFORM public.adjust_wallet(_row.host_id, _net, 'stream_earning', NULL, format('%s Credits earned streaming live', _net));
  INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
  VALUES (NULL, _row.host_id, _rate, _fee);

  UPDATE public.stream_sessions AS session
  SET minutes_billed = session.minutes_billed + 1,
      credits_spent = session.credits_spent + _rate,
      credits_earned = session.credits_earned + _net
  WHERE session.id = _session_id
  RETURNING session.minutes_billed, session.credits_spent, session.credits_earned
  INTO minutes_billed, credits_spent, host_earned;
  RETURN NEXT;
END; $function$;

CREATE OR REPLACE FUNCTION public.tip_credits(_receiver_id uuid, _amount integer, _transaction_type text DEFAULT 'direct_tip'::text, _request_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(transaction_id uuid, sender_balance integer, amount_net integer, amount_platform_fee integer)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE _sender_id uuid := auth.uid(); _sender_wallet uuid; _receiver_wallet uuid; _sender_balance numeric; _fee integer; _net integer; _tx_id uuid;
BEGIN
  IF _sender_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF _amount IS NULL OR _amount <= 0 THEN RAISE EXCEPTION 'Invalid amount'; END IF;
  IF _receiver_id IS NULL OR _receiver_id = _sender_id THEN RAISE EXCEPTION 'Invalid recipient'; END IF;
  IF _transaction_type NOT IN ('bounty_payout', 'direct_tip') THEN RAISE EXCEPTION 'Invalid transaction type'; END IF;

  SELECT wallet_balance INTO _sender_balance FROM public.profiles WHERE id = _sender_id FOR UPDATE;
  IF _sender_balance IS NULL OR _sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient Credits' USING ERRCODE = '22003';
  END IF;

  _fee := ROUND(_amount * public.platform_fee_rate())::integer;
  _net := _amount - _fee;

  _sender_balance := public.adjust_wallet(_sender_id, -_amount, 'tip_sent', _request_id, 'Credits sent');
  PERFORM public.adjust_wallet(_receiver_id, _net, 'tip_received', _request_id, 'Credits received');

  INSERT INTO public.user_credit_wallets (user_id) VALUES (_sender_id) ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.user_credit_wallets (user_id) VALUES (_receiver_id) ON CONFLICT (user_id) DO NOTHING;
  SELECT id INTO _sender_wallet FROM public.user_credit_wallets WHERE user_id = _sender_id;
  SELECT id INTO _receiver_wallet FROM public.user_credit_wallets WHERE user_id = _receiver_id;

  INSERT INTO public.credit_transactions (sender_wallet_id, receiver_wallet_id, request_id, amount_gross, amount_platform_fee, amount_net, transaction_type)
  VALUES (_sender_wallet, _receiver_wallet, _request_id, _amount, _fee, _net, _transaction_type)
  RETURNING id INTO _tx_id;

  RETURN QUERY SELECT _tx_id, _sender_balance::integer, _net, _fee;
END; $function$;
GRANT EXECUTE ON FUNCTION public.tip_credits(uuid, integer, text, uuid) TO authenticated;