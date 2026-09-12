-- 1. Hunter last known locations
CREATE TABLE public.hunter_locations (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.hunter_locations TO authenticated;
GRANT ALL ON public.hunter_locations TO service_role;

ALTER TABLE public.hunter_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Hunters manage their own location"
ON public.hunter_locations FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_hunter_locations_updated_at
BEFORE UPDATE ON public.hunter_locations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Nearby bounty alerts
CREATE OR REPLACE FUNCTION public.notify_nearby_hunters()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _preview text;
BEGIN
  _preview := '📍 New Bounty Nearby! ' || NEW.prompt || ' is available for $' || trim(to_char(NEW.bounty_amount, 'FM999999990.00')) || '.';

  INSERT INTO public.notifications (user_id, kind, request_key, sender_id, preview)
  SELECT h.user_id, 'bounty_nearby', NEW.id::text, NEW.requester_id, _preview
  FROM public.hunter_locations h
  WHERE h.user_id <> NEW.requester_id
    AND h.updated_at > now() - interval '7 days'
    AND (
      3958.8 * 2 * asin(
        sqrt(
          power(sin(radians(h.latitude - NEW.latitude) / 2), 2)
          + cos(radians(NEW.latitude)) * cos(radians(h.latitude))
            * power(sin(radians(h.longitude - NEW.longitude) / 2), 2)
        )
      )
    ) <= 5;

  RETURN NEW;
END;
$$;

CREATE TRIGGER notify_nearby_hunters_on_request
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.notify_nearby_hunters();

-- 3. Earnings wallet balances
CREATE TABLE public.wallet_balances (
  user_id uuid NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  available_balance numeric NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance numeric NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  lifetime_earnings numeric NOT NULL DEFAULT 0 CHECK (lifetime_earnings >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.wallet_balances TO authenticated;
GRANT ALL ON public.wallet_balances TO service_role;

ALTER TABLE public.wallet_balances ENABLE ROW LEVEL SECURITY;

CREATE POLICY "People read their own earnings wallet"
ON public.wallet_balances FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_wallet_balances_updated_at
BEFORE UPDATE ON public.wallet_balances
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Keeps pending/available/lifetime in step with clip submissions and approvals.
CREATE OR REPLACE FUNCTION public.sync_wallet_balance_from_video()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _amount numeric;
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.wallet_balances (user_id, pending_balance)
    VALUES (NEW.uploader_id, NEW.bounty_amount)
    ON CONFLICT (user_id) DO UPDATE
      SET pending_balance = public.wallet_balances.pending_balance + NEW.bounty_amount;
    RETURN NEW;
  END IF;

  IF NEW.accepted_at IS NOT NULL AND OLD.accepted_at IS NULL THEN
    _amount := COALESCE(NULLIF(NEW.payout_amount, 0), NEW.bounty_amount);
    INSERT INTO public.wallet_balances (user_id, available_balance, lifetime_earnings)
    VALUES (NEW.uploader_id, _amount, _amount)
    ON CONFLICT (user_id) DO UPDATE
      SET available_balance = public.wallet_balances.available_balance + _amount,
          lifetime_earnings = public.wallet_balances.lifetime_earnings + _amount,
          pending_balance = GREATEST(0, public.wallet_balances.pending_balance - OLD.bounty_amount);
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER wallet_balance_on_bounty_video
AFTER INSERT OR UPDATE ON public.bounty_videos
FOR EACH ROW EXECUTE FUNCTION public.sync_wallet_balance_from_video();

-- 4. Filing a payout request against the available balance
CREATE OR REPLACE FUNCTION public.request_earnings_payout(_amount numeric, _destination text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _available numeric;
  _id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Sign in to request a payout';
  END IF;
  IF _amount IS NULL OR _amount <= 0 THEN
    RAISE EXCEPTION 'Enter an amount above zero';
  END IF;

  SELECT available_balance INTO _available FROM public.wallet_balances WHERE user_id = _uid FOR UPDATE;
  IF _available IS NULL OR _available < _amount THEN
    RAISE EXCEPTION 'That is more than your available balance';
  END IF;

  UPDATE public.wallet_balances
  SET available_balance = available_balance - _amount
  WHERE user_id = _uid;

  INSERT INTO public.payout_requests (user_id, amount, destination, status)
  VALUES (_uid, _amount, COALESCE(NULLIF(_destination, ''), 'bank'), 'pending')
  RETURNING id INTO _id;

  RETURN _id;
END;
$$;