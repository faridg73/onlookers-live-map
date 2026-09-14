-- Trusted money/XP functions mark themselves for the duration of the transaction so
-- the profile guard can tell backend escrow work from a user editing their own row.
CREATE OR REPLACE FUNCTION public.guard_profile_updates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  -- Internal escrow / payout / XP functions (may run from cron or server code
  -- with no end-user session).
  IF COALESCE(current_setting('app.trusted_write', true), '') = 'on' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthenticated profile updates are not allowed';
  END IF;

  IF public.has_role(auth.uid(), 'admin'::public.app_role)
     OR public.has_role(auth.uid(), 'moderator'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF auth.uid() = OLD.id THEN
    IF NEW.wallet_balance IS DISTINCT FROM OLD.wallet_balance
       OR NEW.legacy_usd_balance IS DISTINCT FROM OLD.legacy_usd_balance
       OR NEW.rating IS DISTINCT FROM OLD.rating
       OR NEW.xp IS DISTINCT FROM OLD.xp
       OR NEW.hunter_level IS DISTINCT FROM OLD.hunter_level
       OR NEW.warning_count IS DISTINCT FROM OLD.warning_count
       OR NEW.banned_at IS DISTINCT FROM OLD.banned_at
       OR NEW.id IS DISTINCT FROM OLD.id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'Protected profile fields cannot be changed directly';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.adjust_wallet(_user_id uuid, _amount numeric, _kind text, _request_id uuid, _note text)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE new_balance numeric; credits numeric;
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

  RETURN new_balance;
END;
$function$;