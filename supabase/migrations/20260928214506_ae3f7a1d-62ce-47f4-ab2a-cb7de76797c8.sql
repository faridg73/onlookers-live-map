CREATE OR REPLACE FUNCTION public.qa_grant_test_credits(_uid uuid, _credits integer, _on_hold boolean DEFAULT false)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _wallet uuid; _balance numeric;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Missing member'; END IF;
  IF _credits IS NULL OR _credits <= 0 OR _credits > 100000 THEN
    RAISE EXCEPTION 'Enter a credit amount between 1 and 100000';
  END IF;
  PERFORM set_config('app.trusted_write', 'on', true);
  _balance := public.adjust_wallet(_uid, _credits, 'credit_purchase', NULL, 'QA test credits');
  _wallet := public.ensure_credit_wallet(_uid);
  INSERT INTO public.credit_transactions
    (receiver_wallet_id, amount_gross, amount_platform_fee, amount_net, transaction_type, available_at)
  VALUES
    (_wallet, _credits, 0, _credits, 'credit_purchase',
     CASE WHEN _on_hold THEN now() + interval '3 days' ELSE now() END);
  RETURN jsonb_build_object('balance', _balance, 'granted', _credits, 'on_hold', COALESCE(_on_hold, false));
END $$;
REVOKE EXECUTE ON FUNCTION public.qa_grant_test_credits(uuid, integer, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_grant_test_credits(uuid, integer, boolean) TO service_role;

CREATE OR REPLACE FUNCTION public.qa_release_credit_holds(_uid uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _rows integer;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Missing member'; END IF;
  PERFORM set_config('app.trusted_write', 'on', true);
  UPDATE public.credit_transactions ct
  SET available_at = now() - interval '1 minute'
  WHERE ct.available_at > now()
    AND ct.receiver_wallet_id IN (SELECT w.id FROM public.user_credit_wallets w WHERE w.user_id = _uid);
  GET DIAGNOSTICS _rows = ROW_COUNT;
  RETURN jsonb_build_object('released', _rows);
END $$;
REVOKE EXECUTE ON FUNCTION public.qa_release_credit_holds(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.qa_release_credit_holds(uuid) TO service_role;