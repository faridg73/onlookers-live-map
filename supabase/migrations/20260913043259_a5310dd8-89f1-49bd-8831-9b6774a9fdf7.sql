-- Coin pack purchases (idempotency ledger for Stripe)
CREATE TABLE public.coin_purchases (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_id text NOT NULL UNIQUE,
  package_id text NOT NULL,
  coins integer NOT NULL CHECK (coins > 0),
  amount_cents integer NOT NULL CHECK (amount_cents >= 0),
  environment text NOT NULL DEFAULT 'sandbox',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.coin_purchases TO authenticated;
GRANT ALL ON public.coin_purchases TO service_role;

ALTER TABLE public.coin_purchases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coin purchases"
ON public.coin_purchases FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.credit_coin_purchase(
  _user_id uuid,
  _session_id text,
  _package_id text,
  _coins integer,
  _amount_cents integer,
  _environment text DEFAULT 'sandbox'
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  _wallet_id := public.ensure_coin_wallet(_user_id);

  UPDATE public.user_wallets
  SET coin_balance = coin_balance + _coins, updated_at = now()
  WHERE id = _wallet_id;

  INSERT INTO public.coin_transactions (
    receiver_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type
  ) VALUES (
    _wallet_id, _coins, 0, _coins, 'coin_purchase'
  );

  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION public.credit_coin_purchase(uuid, text, text, integer, integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.credit_coin_purchase(uuid, text, text, integer, integer, text) TO service_role;

-- Last known GPS point per member, under the canonical name
CREATE VIEW public.user_locations
WITH (security_invoker = true)
AS SELECT user_id, latitude, longitude, updated_at
FROM public.hunter_locations;

GRANT SELECT ON public.user_locations TO authenticated;
GRANT ALL ON public.user_locations TO service_role;

-- Members inside a radius of a venue, minus the requester
CREATE OR REPLACE FUNCTION public.onlookers_within_radius(
  _latitude double precision,
  _longitude double precision,
  _radius_miles numeric DEFAULT 1.5,
  _exclude_user_id uuid DEFAULT NULL
)
RETURNS TABLE(user_id uuid, distance_miles numeric)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.user_id,
    ROUND(
      (3958.8 * 2 * asin(least(1, sqrt(
        power(sin(radians(l.latitude - _latitude) / 2), 2) +
        cos(radians(_latitude)) * cos(radians(l.latitude)) *
        power(sin(radians(l.longitude - _longitude) / 2), 2)
      ))))::numeric,
      2
    ) AS distance_miles
  FROM public.hunter_locations l
  WHERE (_exclude_user_id IS NULL OR l.user_id <> _exclude_user_id)
    AND (3958.8 * 2 * asin(least(1, sqrt(
      power(sin(radians(l.latitude - _latitude) / 2), 2) +
      cos(radians(_latitude)) * cos(radians(l.latitude)) *
      power(sin(radians(l.longitude - _longitude) / 2), 2)
    )))) <= _radius_miles
  ORDER BY distance_miles ASC;
$$;

REVOKE ALL ON FUNCTION public.onlookers_within_radius(double precision, double precision, numeric, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.onlookers_within_radius(double precision, double precision, numeric, uuid) TO service_role;

-- Device push registration tokens
CREATE TABLE public.push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'web',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX push_tokens_user_idx ON public.push_tokens(user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_tokens TO authenticated;
GRANT ALL ON public.push_tokens TO service_role;

ALTER TABLE public.push_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own push tokens"
ON public.push_tokens FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER update_push_tokens_updated_at
BEFORE UPDATE ON public.push_tokens
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();