CREATE OR REPLACE FUNCTION public.resolve_payout(_payout_id uuid, _approve boolean, _note text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE p RECORD;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Admins only';
  END IF;

  SELECT * INTO p FROM public.payout_requests WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND OR p.status NOT IN ('pending', 'requested') THEN
    RAISE EXCEPTION 'This cash-out was already settled';
  END IF;

  IF _approve THEN
    UPDATE public.payout_requests
    SET status = 'paid', note = COALESCE(_note, ''), updated_at = now()
    WHERE id = p.id;
  ELSE
    -- The amount was already held aside when the hunter asked for it, so put it back.
    INSERT INTO public.wallet_balances (user_id, available_balance)
    VALUES (p.user_id, p.amount)
    ON CONFLICT (user_id) DO UPDATE
      SET available_balance = public.wallet_balances.available_balance + p.amount,
          updated_at = now();

    UPDATE public.payout_requests
    SET status = 'rejected', note = COALESCE(_note, ''), updated_at = now()
    WHERE id = p.id;
  END IF;

  RETURN true;
END;
$function$;