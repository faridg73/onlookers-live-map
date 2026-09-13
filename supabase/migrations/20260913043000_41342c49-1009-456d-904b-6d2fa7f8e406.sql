-- 1. Wallets
CREATE TABLE public.user_wallets (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  coin_balance integer NOT NULL DEFAULT 0 CHECK (coin_balance >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_wallets TO authenticated;
GRANT ALL ON public.user_wallets TO service_role;

ALTER TABLE public.user_wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coin wallet"
ON public.user_wallets FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE TRIGGER update_user_wallets_updated_at
BEFORE UPDATE ON public.user_wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. Ledger
CREATE TABLE public.coin_transactions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_wallet_id uuid REFERENCES public.user_wallets(id) ON DELETE SET NULL,
  receiver_wallet_id uuid REFERENCES public.user_wallets(id) ON DELETE SET NULL,
  request_id uuid REFERENCES public.requests(id) ON DELETE SET NULL,
  amount_gross integer NOT NULL CHECK (amount_gross > 0),
  amount_platform_fee integer NOT NULL DEFAULT 0 CHECK (amount_platform_fee >= 0),
  amount_net integer NOT NULL CHECK (amount_net >= 0),
  transaction_type text NOT NULL CHECK (transaction_type IN ('bounty_payout','direct_tip','coin_purchase')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX coin_transactions_sender_idx ON public.coin_transactions(sender_wallet_id, created_at DESC);
CREATE INDEX coin_transactions_receiver_idx ON public.coin_transactions(receiver_wallet_id, created_at DESC);

GRANT SELECT ON public.coin_transactions TO authenticated;
GRANT ALL ON public.coin_transactions TO service_role;

ALTER TABLE public.coin_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own coin transactions"
ON public.coin_transactions FOR SELECT TO authenticated
USING (
  sender_wallet_id IN (SELECT id FROM public.user_wallets WHERE user_id = auth.uid())
  OR receiver_wallet_id IN (SELECT id FROM public.user_wallets WHERE user_id = auth.uid())
);

-- 3. Wallet bootstrap
CREATE OR REPLACE FUNCTION public.ensure_coin_wallet(_user_id uuid DEFAULT auth.uid())
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _wallet_id uuid;
BEGIN
  IF _user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.user_wallets (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO _wallet_id FROM public.user_wallets WHERE user_id = _user_id;
  RETURN _wallet_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ensure_coin_wallet(uuid) TO authenticated;

INSERT INTO public.user_wallets (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- 4. Atomic tip
CREATE OR REPLACE FUNCTION public.tip_coins(
  _receiver_id uuid,
  _amount integer,
  _transaction_type text DEFAULT 'direct_tip',
  _request_id uuid DEFAULT NULL
)
RETURNS TABLE(transaction_id uuid, sender_balance integer, amount_net integer, amount_platform_fee integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sender_id uuid := auth.uid();
  _sender_wallet uuid;
  _receiver_wallet uuid;
  _sender_balance integer;
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

  _sender_wallet := public.ensure_coin_wallet(_sender_id);
  _receiver_wallet := public.ensure_coin_wallet(_receiver_id);

  -- Lock the sender row so concurrent tips cannot double-spend.
  SELECT coin_balance INTO _sender_balance
  FROM public.user_wallets
  WHERE id = _sender_wallet
  FOR UPDATE;

  IF _sender_balance < _amount THEN
    RAISE EXCEPTION 'Insufficient Coins' USING ERRCODE = '22003';
  END IF;

  _fee := floor(_amount * 0.20)::integer;
  _net := _amount - _fee;

  UPDATE public.user_wallets
  SET coin_balance = coin_balance - _amount, updated_at = now()
  WHERE id = _sender_wallet
  RETURNING coin_balance INTO _sender_balance;

  UPDATE public.user_wallets
  SET coin_balance = coin_balance + _net, updated_at = now()
  WHERE id = _receiver_wallet;

  INSERT INTO public.coin_transactions (
    sender_wallet_id, receiver_wallet_id, request_id,
    amount_gross, amount_platform_fee, amount_net, transaction_type
  ) VALUES (
    _sender_wallet, _receiver_wallet, _request_id,
    _amount, _fee, _net, _transaction_type
  ) RETURNING id INTO _tx_id;

  RETURN QUERY SELECT _tx_id, _sender_balance, _net, _fee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.tip_coins(uuid, integer, text, uuid) TO authenticated;

-- Wallet for every new signup
CREATE OR REPLACE FUNCTION public.create_coin_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER create_coin_wallet_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_coin_wallet_for_new_user();