
DROP FUNCTION IF EXISTS public.ensure_credit_wallet(uuid);
DROP FUNCTION IF EXISTS public.admin_payout_queue();

CREATE OR REPLACE FUNCTION public.ensure_credit_wallet(_user_id uuid)
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

  INSERT INTO public.user_credit_wallets (user_id)
  VALUES (_user_id)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT id INTO _wallet_id FROM public.user_credit_wallets WHERE user_id = _user_id;
  RETURN _wallet_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.create_coin_wallet_for_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_credit_wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_payout_queue()
RETURNS TABLE (
  id uuid,
  user_id uuid,
  display_name text,
  amount integer,
  credits_redeemed integer,
  credit_balance integer,
  destination text,
  status text,
  stripe_transfer_id text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Only admins can read the payout queue';
  END IF;

  RETURN QUERY
  SELECT r.id, r.user_id, coalesce(p.display_name, 'Onlooker'), r.amount,
         coalesce(r.credits_redeemed, 0), coalesce(w.credit_balance, 0),
         r.destination, r.status, r.stripe_transfer_id, r.created_at
    FROM public.payout_requests r
    LEFT JOIN public.profiles p ON p.id = r.user_id
    LEFT JOIN public.user_credit_wallets w ON w.user_id = r.user_id
   ORDER BY (r.status IN ('pending', 'requested')) DESC, r.created_at DESC
   LIMIT 200;
END;
$$;
