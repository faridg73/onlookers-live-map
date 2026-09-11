
CREATE TABLE public.payout_accounts (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id text NOT NULL,
  environment text NOT NULL DEFAULT 'sandbox',
  payouts_enabled boolean NOT NULL DEFAULT false,
  details_submitted boolean NOT NULL DEFAULT false,
  requirements_note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_accounts TO authenticated;
GRANT ALL ON public.payout_accounts TO service_role;
ALTER TABLE public.payout_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own payout account"
  ON public.payout_accounts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TABLE public.cashouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'pending',
  stripe_transfer_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  error_message text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX cashouts_user_created_idx ON public.cashouts (user_id, created_at DESC);
GRANT SELECT ON public.cashouts TO authenticated;
GRANT ALL ON public.cashouts TO service_role;
ALTER TABLE public.cashouts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own cashouts"
  ON public.cashouts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER update_payout_accounts_updated_at BEFORE UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_cashouts_updated_at BEFORE UPDATE ON public.cashouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.request_cashout(_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE acct RECORD; cid uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to cash out'; END IF;
  IF _amount IS NULL OR _amount < 10 THEN RAISE EXCEPTION 'Minimum cash out is $10'; END IF;

  SELECT * INTO acct FROM public.payout_accounts WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT acct.payouts_enabled THEN
    RAISE EXCEPTION 'Connect a bank account before cashing out';
  END IF;

  PERFORM public.adjust_wallet(auth.uid(), -ROUND(_amount, 2), 'cashout', NULL, 'Cash out to bank account');

  INSERT INTO public.cashouts (user_id, amount, environment)
  VALUES (auth.uid(), ROUND(_amount, 2), acct.environment)
  RETURNING id INTO cid;

  RETURN cid;
END;
$$;

GRANT EXECUTE ON FUNCTION public.request_cashout(numeric) TO authenticated;
