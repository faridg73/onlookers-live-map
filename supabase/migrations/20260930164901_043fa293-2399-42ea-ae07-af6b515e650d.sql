-- 1) Real fix: approved bounty earnings must create the 3-day security hold.
-- adjust_wallet is the single money step used by accept_bounty_video and
-- escrow_release_on_approval, but it never wrote credit_transactions, so the
-- credit_transactions_hold trigger never ran and earnings were instantly
-- withdrawable.
CREATE OR REPLACE FUNCTION public.adjust_wallet(_user_id uuid, _amount numeric, _kind text, _request_id uuid, _note text)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE new_balance numeric; credits numeric; _wallet uuid; _fee numeric;
BEGIN
  credits := ROUND(COALESCE(_amount, 0));

  PERFORM set_config('app.trusted_write', 'on', true);

  UPDATE public.profiles
  SET wallet_balance = wallet_balance + credits
  WHERE id = _user_id
  RETURNING wallet_balance INTO new_balance;

  PERFORM set_config('app.trusted_write', 'off', true);

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

  -- Bounty earnings go through the 3-day security hold.
  IF _kind = 'bounty_payout' AND _request_id IS NOT NULL AND credits > 0 THEN
    SELECT id INTO _wallet FROM public.user_credit_wallets WHERE user_id = _user_id;
    IF _wallet IS NOT NULL AND NOT EXISTS (
      SELECT 1 FROM public.credit_transactions
      WHERE request_id = _request_id
        AND receiver_wallet_id = _wallet
        AND transaction_type = 'bounty_payout'
    ) THEN
      _fee := GREATEST(ROUND(credits / 0.85) - credits, 0);
      INSERT INTO public.credit_transactions
        (receiver_wallet_id, request_id, amount_gross, amount_platform_fee, amount_net, transaction_type)
      VALUES (_wallet, _request_id, credits + _fee, _fee, credits, 'bounty_payout');
    END IF;
  END IF;

  RETURN new_balance;
END;
$function$;

-- 2) Preview-only simulator: runs a whole bounty from post to approved payout
-- so the hold can be verified on a real earning. Uses the same money step
-- (adjust_wallet 'bounty_payout') as a genuine approval.
CREATE OR REPLACE FUNCTION public.qa_simulate_bounty_payout(_hunter uuid, _bounty integer DEFAULT 20)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _poster uuid; _rid uuid; _vid uuid; _fee numeric; _net numeric; _hold timestamptz;
BEGIN
  IF _hunter IS NULL THEN RAISE EXCEPTION 'Missing user'; END IF;
  IF _bounty IS NULL OR _bounty < 1 OR _bounty > 1000 THEN
    RAISE EXCEPTION 'Bounty must be between 1 and 1000 credits';
  END IF;

  SELECT id INTO _poster FROM auth.users WHERE email = 'qa-poster@onlooker.test' LIMIT 1;
  IF _poster IS NULL THEN RAISE EXCEPTION 'qa_poster_missing'; END IF;
  IF _poster = _hunter THEN RAISE EXCEPTION 'The QA poster cannot be the hunter'; END IF;

  -- Fund the test poster so the escrow hold on insert succeeds.
  PERFORM public.adjust_wallet(_poster, _bounty, 'credit_purchase', NULL, 'QA funding for simulated bounty');

  INSERT INTO public.requests
    (requester_id, prompt, latitude, longitude, location_name, bounty_amount, status, expires_at, details, bounty_type)
  VALUES
    (_poster, 'QA simulated bounty', 29.7604, -95.3698, 'QA test location', _bounty, 'open',
     now() + interval '1 hour', 'Created by the preview testing tool.', 'pre_recorded_clip')
  RETURNING id INTO _rid;

  INSERT INTO public.claims (request_id, spotter_id, status)
  VALUES (_rid, _hunter, 'in_progress');

  INSERT INTO public.bounty_videos
    (request_id, uploader_id, request_title, request_place, bounty_amount, note, storage_path, is_public)
  VALUES
    (_rid::text, _hunter, 'QA simulated bounty', 'QA test location', _bounty,
     'Preview testing tool', 'qa/simulated-bounty.mp4', false)
  RETURNING id INTO _vid;

  -- Same settlement math and ordering as accept_bounty_video.
  _fee := ROUND(_bounty * 0.15);
  _net := ROUND(_bounty) - _fee;
  IF _net > 0 THEN
    PERFORM public.adjust_wallet(_hunter, _net, 'bounty_payout', _rid, 'Looker Coins earned (after 15% app fee)');
  END IF;

  PERFORM set_config('app.trusted_write', 'on', true);

  UPDATE public.bounty_videos
  SET accepted_at = now(), accepted_by = _poster, payout_amount = _net, updated_at = now()
  WHERE id = _vid;

  UPDATE public.escrows
  SET status = 'released', spotter_id = COALESCE(spotter_id, _hunter), updated_at = now()
  WHERE request_id = _rid AND status IN ('held', 'reserved', 'submitted');

  INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
  VALUES (_rid, _hunter, _bounty, _fee);

  UPDATE public.requests SET status = 'completed', updated_at = now()
  WHERE id = _rid AND status <> 'completed';

  UPDATE public.claims SET status = 'approved', updated_at = now()
  WHERE request_id = _rid AND spotter_id = _hunter AND status <> 'approved';

  PERFORM set_config('app.trusted_write', 'off', true);

  SELECT MIN(available_at) INTO _hold
  FROM public.credit_transactions ct
  JOIN public.user_credit_wallets w ON w.id = ct.receiver_wallet_id
  WHERE w.user_id = _hunter AND ct.request_id = _rid;

  RETURN jsonb_build_object('request_id', _rid, 'video_id', _vid, 'net', _net, 'fee', _fee, 'available_at', _hold);
END;
$function$;

REVOKE ALL ON FUNCTION public.qa_simulate_bounty_payout(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.qa_simulate_bounty_payout(uuid, integer) TO service_role;