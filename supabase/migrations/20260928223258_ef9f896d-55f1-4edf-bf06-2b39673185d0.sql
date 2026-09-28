CREATE TABLE IF NOT EXISTS public.account_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  ip_address text,
  device_hash text,
  first_seen_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.account_signals TO authenticated;
GRANT ALL ON public.account_signals TO service_role;
ALTER TABLE public.account_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view account signals" ON public.account_signals
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE UNIQUE INDEX IF NOT EXISTS account_signals_unique
  ON public.account_signals(user_id, COALESCE(ip_address, ''), COALESCE(device_hash, ''));
CREATE INDEX IF NOT EXISTS account_signals_ip_idx ON public.account_signals(ip_address, last_seen_at DESC);
CREATE INDEX IF NOT EXISTS account_signals_device_idx ON public.account_signals(device_hash, last_seen_at DESC);

-- Records the network address and device signature a member acted from.
CREATE OR REPLACE FUNCTION public.record_account_signal(_uid uuid, _ip text, _device text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF _uid IS NULL THEN RETURN; END IF;
  IF COALESCE(_ip, '') = '' AND COALESCE(_device, '') = '' THEN RETURN; END IF;
  INSERT INTO public.account_signals (user_id, ip_address, device_hash)
  VALUES (_uid, NULLIF(_ip, ''), NULLIF(_device, ''))
  ON CONFLICT (user_id, COALESCE(ip_address, ''), COALESCE(device_hash, ''))
  DO UPDATE SET last_seen_at = now();
END $$;
REVOKE EXECUTE ON FUNCTION public.record_account_signal(uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_account_signal(uuid, text, text) TO service_role;

-- Compares both sides of a settled bounty and raises a staff review item when
-- they look like the same person. Never blocks the payout.
CREATE OR REPLACE FUNCTION public.flag_bounty_self_dealing(_request_id uuid, _payer uuid, _payee uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _signals jsonb := '{}'::jsonb;
  _ips text[];
  _devices text[];
  _accounts text[];
  _hit boolean := false;
BEGIN
  IF _payer IS NULL OR _payee IS NULL THEN RETURN _signals; END IF;

  IF _payer = _payee THEN
    _signals := _signals || jsonb_build_object('same_account', true);
    _hit := true;
  END IF;

  -- Shared payout destination: the strongest signal, since the cash lands in one place.
  SELECT array_agg(DISTINCT a.stripe_account_id) INTO _accounts
  FROM public.payout_accounts a
  WHERE a.user_id = _payer
    AND a.stripe_account_id IS NOT NULL
    AND a.stripe_account_id IN (
      SELECT b.stripe_account_id FROM public.payout_accounts b WHERE b.user_id = _payee
    );
  IF _accounts IS NOT NULL AND array_length(_accounts, 1) > 0 THEN
    _signals := _signals || jsonb_build_object('shared_payout_account', to_jsonb(_accounts));
    _hit := true;
  END IF;

  -- Shared network address inside the last 30 days.
  SELECT array_agg(DISTINCT x.ip_address) INTO _ips
  FROM public.account_signals x
  WHERE x.user_id = _payer
    AND x.ip_address IS NOT NULL
    AND x.last_seen_at > now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM public.account_signals y
      WHERE y.user_id = _payee
        AND y.ip_address = x.ip_address
        AND y.last_seen_at > now() - interval '30 days'
    );
  IF _ips IS NOT NULL AND array_length(_ips, 1) > 0 THEN
    _signals := _signals || jsonb_build_object('shared_ip', to_jsonb(_ips));
    _hit := true;
  END IF;

  -- Shared device signature inside the last 30 days.
  SELECT array_agg(DISTINCT x.device_hash) INTO _devices
  FROM public.account_signals x
  WHERE x.user_id = _payer
    AND x.device_hash IS NOT NULL
    AND x.last_seen_at > now() - interval '30 days'
    AND EXISTS (
      SELECT 1 FROM public.account_signals y
      WHERE y.user_id = _payee
        AND y.device_hash = x.device_hash
        AND y.last_seen_at > now() - interval '30 days'
    );
  IF _devices IS NOT NULL AND array_length(_devices, 1) > 0 THEN
    _signals := _signals || jsonb_build_object('shared_device', to_jsonb(_devices));
    _hit := true;
  END IF;

  IF NOT _hit THEN RETURN _signals; END IF;

  INSERT INTO public.bounty_risk_flags (request_id, user_id, counterparty_id, flag_type, signals, status)
  VALUES (_request_id, _payee, _payer, 'self_dealing', _signals, 'open');

  INSERT INTO public.payout_security_logs (user_id, event_type, details)
  VALUES (_payee, 'self_dealing_suspected',
    jsonb_build_object('request_id', _request_id, 'counterparty', _payer, 'signals', _signals));

  -- Keep the earnings parked longer than the normal 3 days so staff can review
  -- before the money can leave for a bank account.
  IF _request_id IS NOT NULL THEN
    UPDATE public.credit_transactions ct
    SET available_at = GREATEST(ct.available_at, now() + interval '7 days')
    WHERE ct.request_id = _request_id
      AND ct.receiver_wallet_id IN (SELECT id FROM public.user_credit_wallets WHERE user_id = _payee);
  END IF;

  RETURN _signals;
END $$;
REVOKE EXECUTE ON FUNCTION public.flag_bounty_self_dealing(uuid, uuid, uuid) FROM PUBLIC, anon, authenticated;

-- Clip approval now runs the self-dealing comparison right after the payout.
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
    rid := regexp_replace(v.request_id, '^db-', '')::uuid;
  EXCEPTION WHEN others THEN
    rid := NULL;
  END;

  IF rid IS NOT NULL THEN
    SELECT * INTO req FROM public.requests WHERE id = rid FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Bounty not found'; END IF;
    IF req.requester_id <> auth.uid() THEN
      RAISE EXCEPTION 'Only the person who posted this request can accept the clip';
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.escrows e
      WHERE e.request_id = rid AND e.status = 'disputed'
    ) THEN
      RAISE EXCEPTION 'This bounty is under review by a moderator. Payment is on hold until the dispute is settled.';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM public.claims c
      WHERE c.request_id = rid
        AND c.spotter_id = v.uploader_id
        AND c.status IN ('in_progress', 'submitted')
    ) THEN
      RAISE EXCEPTION 'This clip is not attached to the assigned Onlooker';
    END IF;
  END IF;

  fee := ROUND(COALESCE(v.bounty_amount, 0) * 0.15);
  net := ROUND(COALESCE(v.bounty_amount, 0)) - fee;
  IF net > 0 THEN
    PERFORM public.adjust_wallet(v.uploader_id, net, 'bounty_payout', rid, 'Looker Coins earned (after 15% app fee)');
  END IF;

  PERFORM set_config('app.trusted_write', 'on', true);

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
    WHERE request_id = rid AND spotter_id = v.uploader_id AND status <> 'approved';
  END IF;

  -- Money has moved: compare both sides and raise a staff review item if the
  -- payer and the payee look like the same person.
  PERFORM public.flag_bounty_self_dealing(rid, auth.uid(), v.uploader_id);

  PERFORM public.award_xp(v.uploader_id, 100, 'bounty_completed');
  PERFORM set_config('app.trusted_write', 'off', true);

  RETURN net;
END;
$function$;

-- Staff review list for open risk flags.
CREATE OR REPLACE FUNCTION public.admin_risk_flags()
RETURNS TABLE (
  id uuid,
  request_id uuid,
  flag_type text,
  status text,
  signals jsonb,
  created_at timestamptz,
  payee_id uuid,
  payee_name text,
  payer_id uuid,
  payer_name text
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT f.id, f.request_id, f.flag_type, f.status, f.signals, f.created_at,
         f.user_id, p1.display_name, f.counterparty_id, p2.display_name
  FROM public.bounty_risk_flags f
  LEFT JOIN public.profiles p1 ON p1.id = f.user_id
  LEFT JOIN public.profiles p2 ON p2.id = f.counterparty_id
  WHERE public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator')
  ORDER BY f.created_at DESC
  LIMIT 200;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_risk_flags() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_risk_flags() TO authenticated;