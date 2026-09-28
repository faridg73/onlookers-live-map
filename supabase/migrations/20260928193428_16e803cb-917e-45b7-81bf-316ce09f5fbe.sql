CREATE OR REPLACE FUNCTION public.credits_on_hold(_uid uuid)
RETURNS integer LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE(sum(ct.amount_net), 0)::int
  FROM public.credit_transactions ct
  JOIN public.user_credit_wallets w ON w.id = ct.receiver_wallet_id
  WHERE w.user_id = _uid AND ct.available_at > now();
$$;

CREATE OR REPLACE FUNCTION public.my_cashout_status()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _bal numeric; _changed timestamptz; _held int; _next timestamptz;
BEGIN
  IF _uid IS NULL THEN RETURN NULL; END IF;
  SELECT wallet_balance, payout_method_changed_at INTO _bal, _changed FROM public.profiles WHERE id = _uid;
  _held := LEAST(public.credits_on_hold(_uid), COALESCE(_bal,0)::int);
  SELECT min(ct.available_at) INTO _next FROM public.credit_transactions ct
    JOIN public.user_credit_wallets w ON w.id = ct.receiver_wallet_id
    WHERE w.user_id = _uid AND ct.available_at > now();
  RETURN jsonb_build_object(
    'balance', COALESCE(_bal,0), 'on_hold', _held,
    'available', GREATEST(COALESCE(_bal,0)::int - _held, 0),
    'next_release_at', _next,
    'cooldown_until', CASE WHEN _changed > now() - interval '24 hours' THEN _changed + interval '24 hours' END);
END $$;
REVOKE EXECUTE ON FUNCTION public.credits_on_hold(uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.my_cashout_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.my_cashout_status() TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_payout_method_changed()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT'
     OR NEW.stripe_account_id IS DISTINCT FROM OLD.stripe_account_id
     OR (NEW.payouts_enabled AND NOT COALESCE(OLD.payouts_enabled,false)) THEN
    UPDATE public.profiles SET payout_method_changed_at = now() WHERE id = NEW.user_id;
    INSERT INTO public.payout_security_logs (user_id, event_type, details)
      VALUES (NEW.user_id, 'payout_method_changed', jsonb_build_object('account', NEW.stripe_account_id));
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS payout_accounts_method_changed ON public.payout_accounts;
CREATE TRIGGER payout_accounts_method_changed AFTER INSERT OR UPDATE ON public.payout_accounts
  FOR EACH ROW EXECUTE FUNCTION public.mark_payout_method_changed();

CREATE OR REPLACE FUNCTION public.guard_cashout_hold_and_cooldown(_uid uuid, _coins integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _bal numeric; _changed timestamptz; _held int;
BEGIN
  SELECT wallet_balance, payout_method_changed_at INTO _bal, _changed FROM public.profiles WHERE id = _uid;
  IF _changed > now() - interval '24 hours' THEN
    RAISE EXCEPTION 'PAYOUT_COOLDOWN';
  END IF;
  _held := public.credits_on_hold(_uid);
  IF COALESCE(_bal,0) - _held < _coins THEN
    RAISE EXCEPTION 'ON_HOLD';
  END IF;
END $$;
REVOKE EXECUTE ON FUNCTION public.guard_cashout_hold_and_cooldown(uuid, integer) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.guard_cashout_velocity_and_hold()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.destination = 'stripe_connect' AND NEW.status = 'pending' THEN
    -- balance already debited at this point; re-add to compare against hold
    PERFORM 1;
  END IF;
  RETURN NEW;
END $$;
DROP FUNCTION public.guard_cashout_velocity_and_hold();