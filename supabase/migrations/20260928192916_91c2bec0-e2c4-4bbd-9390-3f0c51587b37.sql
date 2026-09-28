ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS payout_identity_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS account_frozen_at timestamptz,
  ADD COLUMN IF NOT EXISTS payout_country text,
  ADD COLUMN IF NOT EXISTS payout_method_changed_at timestamptz;

ALTER TABLE public.credit_transactions
  ADD COLUMN IF NOT EXISTS available_at timestamptz NOT NULL DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_credit_hold()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.request_id IS NOT NULL AND NEW.receiver_wallet_id IS NOT NULL THEN
    NEW.available_at := COALESCE(NEW.created_at, now()) + interval '3 days';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS credit_transactions_hold ON public.credit_transactions;
CREATE TRIGGER credit_transactions_hold BEFORE INSERT ON public.credit_transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_credit_hold();

CREATE OR REPLACE FUNCTION public.guard_payout_security_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_setting('request.jwt.claim.role', true) = 'service_role'
     OR current_user IN ('postgres','service_role','supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.payout_identity_verified_at IS DISTINCT FROM OLD.payout_identity_verified_at
     OR NEW.payout_country IS DISTINCT FROM OLD.payout_country
     OR NEW.payout_method_changed_at IS DISTINCT FROM OLD.payout_method_changed_at THEN
    RAISE EXCEPTION 'These payout fields can only be changed by Onlooker.';
  END IF;
  IF OLD.account_frozen_at IS NOT NULL AND NEW.account_frozen_at IS DISTINCT FROM OLD.account_frozen_at THEN
    RAISE EXCEPTION 'A frozen account can only be unfrozen after an identity re-check.';
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS profiles_guard_payout_security ON public.profiles;
CREATE TRIGGER profiles_guard_payout_security BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_payout_security_fields();

CREATE TABLE public.payout_security_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  event_type text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payout_security_logs TO authenticated;
GRANT ALL ON public.payout_security_logs TO service_role;
ALTER TABLE public.payout_security_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own or admin can view payout security logs" ON public.payout_security_logs
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE INDEX payout_security_logs_user_idx ON public.payout_security_logs(user_id, created_at DESC);

CREATE TABLE public.bounty_risk_flags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid,
  user_id uuid NOT NULL,
  counterparty_id uuid,
  flag_type text NOT NULL,
  signals jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'open',
  resolved_by uuid,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.bounty_risk_flags TO authenticated;
GRANT ALL ON public.bounty_risk_flags TO service_role;
ALTER TABLE public.bounty_risk_flags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Staff can view risk flags" ON public.bounty_risk_flags
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE POLICY "Staff can resolve risk flags" ON public.bounty_risk_flags
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'moderator'));
CREATE INDEX bounty_risk_flags_status_idx ON public.bounty_risk_flags(status, created_at DESC);

CREATE OR REPLACE FUNCTION public.touch_bounty_risk_flags()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;
CREATE TRIGGER bounty_risk_flags_touch BEFORE UPDATE ON public.bounty_risk_flags
  FOR EACH ROW EXECUTE FUNCTION public.touch_bounty_risk_flags();