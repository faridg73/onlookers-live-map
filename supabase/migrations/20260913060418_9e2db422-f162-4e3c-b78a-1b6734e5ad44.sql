-- 1. Keep a permanent record of pre-conversion dollar balances
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS legacy_usd_balance numeric NOT NULL DEFAULT 0;

ALTER TABLE public.wallet_balances
  ADD COLUMN IF NOT EXISTS legacy_usd_available numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_usd_pending numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS legacy_usd_lifetime numeric NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.profiles.wallet_balance IS 'Looker Coin balance (whole coins). 10 coins = $1.00 USD.';
COMMENT ON COLUMN public.profiles.legacy_usd_balance IS 'Dollar balance recorded immediately before the Looker Coin conversion.';

-- 2. One balance: adjust_wallet works in whole coins and mirrors the coin wallet row
CREATE OR REPLACE FUNCTION public.adjust_wallet(_user_id uuid, _amount numeric, _kind text, _request_id uuid, _note text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_balance numeric; coins numeric;
BEGIN
  coins := ROUND(COALESCE(_amount, 0));

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + coins
  WHERE id = _user_id
  RETURNING wallet_balance INTO new_balance;

  IF new_balance IS NULL THEN
    RAISE EXCEPTION 'Wallet not found';
  END IF;
  IF new_balance < 0 THEN
    RAISE EXCEPTION 'Insufficient Looker Coins';
  END IF;

  INSERT INTO public.user_wallets (user_id, coin_balance)
  VALUES (_user_id, new_balance::integer)
  ON CONFLICT (user_id) DO UPDATE
    SET coin_balance = new_balance::integer, updated_at = now();

  INSERT INTO public.wallet_transactions (user_id, request_id, kind, amount, balance_after, note)
  VALUES (_user_id, _request_id, _kind, coins, new_balance, COALESCE(_note, ''));

  RETURN new_balance;
END;
$function$;

-- 3. Coin purchases credit the single coin balance
CREATE OR REPLACE FUNCTION public.credit_coin_purchase(_user_id uuid, _session_id text, _package_id text, _coins integer, _amount_cents integer, _environment text DEFAULT 'sandbox'::text)
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
    RAISE EXCEPTION 'Invalid coin purchase';
  END IF;

  INSERT INTO public.coin_purchases (
    user_id, session_id, package_id, coins, amount_cents, environment
  ) VALUES (
    _user_id, _session_id, _package_id, _coins, GREATEST(_amount_cents, 0), _environment
  )
  ON CONFLICT (session_id) DO NOTHING
  RETURNING id INTO _inserted;

  IF _inserted IS NULL THEN
    RETURN false; -- already credited
  END IF;

  PERFORM public.adjust_wallet(_user_id, _coins, 'coin_purchase', NULL,
    format('%s Looker Coins purchased', _coins));

  _wallet_id := public.ensure_coin_wallet(_user_id);

  INSERT INTO public.coin_transactions (
    receiver_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type
  ) VALUES (
    _wallet_id, _coins, 0, _coins, 'coin_purchase'
  );

  RETURN true;
END;
$function$;

-- 4. Cash out redeems coins from the single balance
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
  IF _coins IS NULL OR _coins < 100 THEN
    RAISE EXCEPTION 'Minimum cash out is 100 Looker Coins';
  END IF;

  SELECT wallet_balance INTO _balance
  FROM public.profiles WHERE id = _uid FOR UPDATE;

  IF _balance IS NULL OR _balance < _coins THEN
    RAISE EXCEPTION 'Insufficient Coins';
  END IF;

  _cash := round((_coins::numeric / 10.0), 2);

  PERFORM public.adjust_wallet(_uid, -_coins, 'coin_cashout', NULL,
    format('%s Looker Coins redeemed for cash', _coins));

  INSERT INTO public.payout_requests (user_id, amount, destination, status, note, coins_redeemed, cash_amount_usd)
  VALUES (_uid, _coins, 'stripe_connect', 'pending', format('%s Looker Coins redeemed at 10 coins = $1.00', _coins), _coins, _cash)
  RETURNING id INTO _payout_id;

  _wallet_id := public.ensure_coin_wallet(_uid);

  INSERT INTO public.coin_transactions (sender_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type)
  VALUES (_wallet_id, _coins, 0, _coins, 'coin_cashout');

  RETURN _payout_id;
END;
$function$;

-- 5. Coin transfers move the single balance
CREATE OR REPLACE FUNCTION public.tip_coins(_receiver_id uuid, _amount integer, _transaction_type text DEFAULT 'direct_tip'::text, _request_id uuid DEFAULT NULL::uuid)
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
    RAISE EXCEPTION 'Insufficient Coins' USING ERRCODE = '22003';
  END IF;

  _fee := floor(_amount * 0.20)::integer;
  _net := _amount - _fee;

  _sender_balance := public.adjust_wallet(_sender_id, -_amount, 'tip_sent', _request_id, 'Looker Coins sent');
  PERFORM public.adjust_wallet(_receiver_id, _net, 'tip_received', _request_id, 'Looker Coins received');

  _sender_wallet := public.ensure_coin_wallet(_sender_id);
  _receiver_wallet := public.ensure_coin_wallet(_receiver_id);

  INSERT INTO public.coin_transactions (
    sender_wallet_id, receiver_wallet_id, request_id,
    amount_gross, amount_platform_fee, amount_net, transaction_type
  ) VALUES (
    _sender_wallet, _receiver_wallet, _request_id,
    _amount, _fee, _net, _transaction_type
  ) RETURNING id INTO _tx_id;

  RETURN QUERY SELECT _tx_id, _sender_balance::integer, _net, _fee;
END;
$function$;

-- 6. Whole-coin platform fees on bounty payouts
CREATE OR REPLACE FUNCTION public.accept_bounty_video(_video_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v RECORD; fee numeric; net numeric; rid uuid; req RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to accept a clip'; END IF;

  SELECT * INTO v FROM public.bounty_videos WHERE id = _video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clip not found'; END IF;
  IF v.uploader_id = auth.uid() THEN RAISE EXCEPTION 'You cannot accept your own clip'; END IF;
  IF v.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'This clip was already paid out'; END IF;

  BEGIN
    rid := v.request_id::uuid;
  EXCEPTION WHEN others THEN
    rid := NULL;
  END;

  IF rid IS NOT NULL THEN
    SELECT * INTO req FROM public.requests WHERE id = rid FOR UPDATE;
    IF FOUND AND req.requester_id <> auth.uid() THEN
      RAISE EXCEPTION 'Only the person who posted this request can accept the clip';
    END IF;
  END IF;

  fee := ROUND(COALESCE(v.bounty_amount, 0) * 0.15);
  net := ROUND(COALESCE(v.bounty_amount, 0)) - fee;
  IF net > 0 THEN
    PERFORM public.adjust_wallet(v.uploader_id, net, 'bounty_payout', rid, 'Looker Coins earned (after 15% app fee)');
  END IF;

  UPDATE public.bounty_videos
  SET accepted_at = now(), accepted_by = auth.uid(), payout_amount = net, updated_at = now()
  WHERE id = v.id;

  IF rid IS NOT NULL AND req.id IS NOT NULL THEN
    UPDATE public.escrows
    SET status = 'released', spotter_id = COALESCE(spotter_id, v.uploader_id), updated_at = now()
    WHERE request_id = rid AND status IN ('held', 'reserved', 'submitted');

    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (rid, v.uploader_id, COALESCE(v.bounty_amount, 0), fee);

    UPDATE public.requests
    SET status = 'completed', updated_at = now()
    WHERE id = rid AND status <> 'completed';

    UPDATE public.claims
    SET status = 'approved', updated_at = now()
    WHERE request_id = rid AND status <> 'approved';
  END IF;

  PERFORM public.award_xp(v.uploader_id, 100);
  RETURN net;
END;
$function$;

CREATE OR REPLACE FUNCTION public.submit_instant_snippet(_video_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE v RECORD; rid uuid; fee numeric; net numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;

  SELECT * INTO v FROM public.bounty_videos WHERE id = _video_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Clip not found'; END IF;
  IF v.uploader_id <> auth.uid() THEN RAISE EXCEPTION 'Only the reporter can submit this clip'; END IF;
  IF v.accepted_at IS NOT NULL THEN RAISE EXCEPTION 'This clip was already paid out'; END IF;

  BEGIN rid := v.request_id::uuid; EXCEPTION WHEN others THEN rid := NULL; END;

  fee := ROUND(COALESCE(v.bounty_amount, 0) * 0.15);
  net := ROUND(COALESCE(v.bounty_amount, 0)) - fee;
  IF net > 0 THEN
    PERFORM public.adjust_wallet(v.uploader_id, net, 'bounty_payout', rid,
      'Instant snippet paid on the spot (after 15% app fee)');
  END IF;

  UPDATE public.bounty_videos
  SET accepted_at = now(), payout_amount = net, is_instant = true, updated_at = now()
  WHERE id = v.id;

  IF rid IS NOT NULL THEN
    UPDATE public.escrows
    SET status = 'released', spotter_id = COALESCE(spotter_id, v.uploader_id), updated_at = now()
    WHERE request_id = rid AND status IN ('held','reserved','submitted');

    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (rid, v.uploader_id, COALESCE(v.bounty_amount, 0), fee);

    UPDATE public.requests SET status = 'completed', updated_at = now()
    WHERE id = rid AND status <> 'completed';

    UPDATE public.claims SET status = 'approved', updated_at = now()
    WHERE request_id = rid AND status <> 'approved';
  END IF;

  PERFORM public.award_xp(v.uploader_id, 100);
  RETURN net;
END;
$function$;

CREATE OR REPLACE FUNCTION public.escrow_release_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE e RECORD; fee numeric; net numeric;
BEGIN
  IF NEW.status = 'approved' AND OLD.status IS DISTINCT FROM NEW.status THEN
    SELECT * INTO e FROM public.escrows
    WHERE request_id = NEW.request_id AND status IN ('reserved','submitted')
    FOR UPDATE;

    IF FOUND THEN
      fee := ROUND(e.amount * 0.15);
      net := ROUND(e.amount) - fee;
      IF net > 0 THEN
        PERFORM public.adjust_wallet(NEW.spotter_id, net, 'bounty_payout', NEW.request_id, 'Looker Coins earned (after 15% app fee)');
      END IF;
      IF e.amount > 0 THEN
        INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
        VALUES (NEW.request_id, NEW.spotter_id, e.amount, fee);
      END IF;
      UPDATE public.escrows
      SET status = 'released', spotter_id = NEW.spotter_id, updated_at = now()
      WHERE id = e.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 7. Tips are 5 to 200 Looker Coins
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
  IF amt < 5 OR amt > 200 THEN RAISE EXCEPTION 'Tips are between 5 and 200 Looker Coins'; END IF;

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

-- 8. Auto-release settles in whole coins too
CREATE OR REPLACE FUNCTION public.settle_escrows()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  rec RECORD;
  vid RECORD;
  fee numeric;
  net numeric;
  spotter uuid;
  auto_approved int := 0;
  refunded int := 0;
  unlocked int := 0;
BEGIN
  FOR rec IN
    SELECT e.* FROM public.escrows e
    WHERE e.status = 'submitted' AND e.auto_release_at IS NOT NULL AND e.auto_release_at <= now()
    FOR UPDATE
  LOOP
    SELECT * INTO vid FROM public.bounty_videos
    WHERE request_id = rec.request_id::text AND accepted_at IS NULL
    ORDER BY created_at ASC LIMIT 1;

    spotter := COALESCE(vid.uploader_id, rec.spotter_id);
    fee := ROUND(rec.amount * 0.15);
    net := ROUND(rec.amount) - fee;

    IF spotter IS NOT NULL AND net > 0 THEN
      PERFORM public.adjust_wallet(spotter, net, 'bounty_payout', rec.request_id,
        'Looker Coins earned (auto-released after review window)');

      INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
      VALUES (rec.request_id, spotter, rec.amount, fee);

      IF vid.id IS NOT NULL THEN
        UPDATE public.bounty_videos
        SET accepted_at = now(), accepted_by = rec.requester_id, payout_amount = net, updated_at = now()
        WHERE id = vid.id;
      END IF;

      UPDATE public.escrows
      SET status = 'released', spotter_id = spotter, updated_at = now()
      WHERE id = rec.id;

      UPDATE public.requests SET status = 'completed', updated_at = now()
      WHERE id = rec.request_id AND status <> 'completed';

      UPDATE public.claims SET status = 'approved', updated_at = now()
      WHERE request_id = rec.request_id AND status <> 'approved';

      auto_approved := auto_approved + 1;
    END IF;
  END LOOP;

  FOR rec IN
    SELECT e.id, e.request_id, e.spotter_id
    FROM public.escrows e
    JOIN public.requests r ON r.id = e.request_id
    WHERE e.status = 'reserved'
      AND ((e.reserved_until IS NOT NULL AND e.reserved_until <= now())
           OR r.expires_at <= now())
  LOOP
    DELETE FROM public.claims
    WHERE request_id = rec.request_id AND spotter_id = rec.spotter_id AND status = 'in_progress';

    UPDATE public.escrows
    SET status = 'held', spotter_id = NULL, reserved_until = NULL, updated_at = now()
    WHERE id = rec.id;

    UPDATE public.requests
    SET status = 'open'
    WHERE id = rec.request_id AND status = 'claimed' AND expires_at > now();

    unlocked := unlocked + 1;
  END LOOP;

  FOR rec IN
    SELECT e.id, e.requester_id, e.amount, r.id AS request_id
    FROM public.escrows e
    JOIN public.requests r ON r.id = e.request_id
    WHERE e.status = 'held' AND r.expires_at <= now() AND r.status IN ('open','claimed','expired')
  LOOP
    IF rec.amount > 0 THEN
      PERFORM public.adjust_wallet(rec.requester_id, rec.amount, 'escrow_refund', rec.request_id, 'Request expired - Looker Coins refunded');
    END IF;
    UPDATE public.escrows SET status = 'refunded', updated_at = now() WHERE id = rec.id;
    UPDATE public.requests SET status = 'expired' WHERE id = rec.request_id AND status <> 'completed';
    refunded := refunded + 1;
  END LOOP;

  RETURN jsonb_build_object('auto_approved', auto_approved, 'unlocked', unlocked, 'refunded', refunded);
END;
$function$;