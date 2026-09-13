CREATE OR REPLACE FUNCTION public.request_cashout(_amount numeric)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE acct RECORD; cid uuid; coins numeric;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to cash out'; END IF;
  coins := ROUND(COALESCE(_amount, 0));
  IF coins < 100 THEN RAISE EXCEPTION 'Minimum cash out is 100 Looker Coins'; END IF;

  SELECT * INTO acct FROM public.payout_accounts WHERE user_id = auth.uid() FOR UPDATE;
  IF NOT FOUND OR NOT acct.payouts_enabled THEN
    RAISE EXCEPTION 'Connect a bank account before cashing out';
  END IF;

  PERFORM public.adjust_wallet(auth.uid(), -coins, 'cashout', NULL, 'Looker Coins cashed out to bank account');

  INSERT INTO public.cashouts (user_id, amount, environment)
  VALUES (auth.uid(), coins, acct.environment)
  RETURNING id INTO cid;

  RETURN cid;
END;
$function$;