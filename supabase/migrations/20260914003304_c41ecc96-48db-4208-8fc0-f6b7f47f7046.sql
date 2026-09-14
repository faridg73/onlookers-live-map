-- 1. PROFILES: block self-service edits of protected fields
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL OR public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at
     OR NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
     OR NEW.legacy_usd_balance IS DISTINCT FROM OLD.legacy_usd_balance
     OR NEW.rating IS DISTINCT FROM OLD.rating
     OR NEW.xp IS DISTINCT FROM OLD.xp
     OR NEW.hunter_level IS DISTINCT FROM OLD.hunter_level
     OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
     OR NEW.banned_at IS DISTINCT FROM OLD.banned_at THEN
    RAISE EXCEPTION 'Wallet balance, rating, XP, level, warnings and ban status are set by the system, not by the account holder';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profile_updates ON public.profiles;
CREATE TRIGGER guard_profile_updates
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_updates();

-- 2. REQUESTS: lock bounty details once a claim exists
CREATE OR REPLACE FUNCTION public.guard_requester_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF auth.uid() IS NULL
     OR auth.uid() <> OLD.requester_id
     OR public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.claims c WHERE c.request_id = OLD.id) THEN
    IF NEW.bounty_amount IS DISTINCT FROM OLD.bounty_amount
       OR NEW.prompt IS DISTINCT FROM OLD.prompt
       OR NEW.details IS DISTINCT FROM OLD.details
       OR NEW.checklist IS DISTINCT FROM OLD.checklist
       OR COALESCE(NEW.category, '') IS DISTINCT FROM COALESCE(OLD.category, '')
       OR NEW.latitude IS DISTINCT FROM OLD.latitude
       OR NEW.longitude IS DISTINCT FROM OLD.longitude
       OR COALESCE(NEW.location_name, '') IS DISTINCT FROM COALESCE(OLD.location_name, '')
       OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
       OR NEW.requester_id IS DISTINCT FROM OLD.requester_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
      RAISE EXCEPTION 'A hunter already claimed this bounty, so its reward, brief, location and expiry can no longer be changed';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_requester_updates ON public.requests;
CREATE TRIGGER guard_requester_updates
  BEFORE UPDATE ON public.requests
  FOR EACH ROW EXECUTE FUNCTION public.guard_requester_updates();

-- 3. BOUNTY_POOLS: credits only move through the official chip-in flow
CREATE OR REPLACE FUNCTION public.guard_bounty_pool_updates()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF coalesce(current_setting('app.pool_ledger', true), '') = 'on'
     OR auth.uid() IS NULL
     OR public.is_review_staff(auth.uid()) THEN
    RETURN NEW;
  END IF;

  IF NEW.pooled_credits IS DISTINCT FROM OLD.pooled_credits
     OR NEW.goal_credits IS DISTINCT FROM OLD.goal_credits
     OR NEW.creator_id IS DISTINCT FROM OLD.creator_id
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Pooled and goal credits are managed by the chip-in flow, not editable directly';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_bounty_pool_updates ON public.bounty_pools;
CREATE TRIGGER guard_bounty_pool_updates
  BEFORE UPDATE ON public.bounty_pools
  FOR EACH ROW EXECUTE FUNCTION public.guard_bounty_pool_updates();

-- allow the official chip-in RPC to move credits
CREATE OR REPLACE FUNCTION public.contribute_to_pool(_pool_id uuid, _amount integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _wallet uuid;
  _balance integer;
  _pooled integer;
  _status text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'You must be signed in.'; END IF;
  IF _amount < 1 THEN RAISE EXCEPTION 'Chip in at least 1 Credit.'; END IF;

  SELECT status INTO _status FROM public.bounty_pools WHERE id = _pool_id FOR UPDATE;
  IF _status IS NULL THEN RAISE EXCEPTION 'That pool no longer exists.'; END IF;
  IF _status <> 'open' THEN RAISE EXCEPTION 'That pool is closed.'; END IF;

  _wallet := public.ensure_credit_wallet(_uid);
  SELECT credit_balance INTO _balance FROM public.user_credit_wallets WHERE id = _wallet FOR UPDATE;
  IF _balance < _amount THEN RAISE EXCEPTION 'Insufficient Credits'; END IF;

  UPDATE public.user_credit_wallets
    SET credit_balance = credit_balance - _amount, updated_at = now()
    WHERE id = _wallet;

  INSERT INTO public.pool_contributions (pool_id, user_id, amount)
  VALUES (_pool_id, _uid, _amount);

  PERFORM set_config('app.pool_ledger', 'on', true);

  UPDATE public.bounty_pools
    SET pooled_credits = pooled_credits + _amount,
        status = CASE WHEN pooled_credits + _amount >= goal_credits THEN 'funded' ELSE status END
    WHERE id = _pool_id
    RETURNING pooled_credits INTO _pooled;

  PERFORM set_config('app.pool_ledger', 'off', true);

  RETURN _pooled;
END;
$$;