DROP TRIGGER IF EXISTS payout_hold_on_request ON public.payout_requests;

CREATE OR REPLACE FUNCTION public.refund_failed_credit_cashout(_payout_id uuid, _reason text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p RECORD;
BEGIN
  SELECT * INTO p FROM public.payout_requests WHERE id = _payout_id FOR UPDATE;
  IF NOT FOUND OR p.status <> 'pending' OR p.credits_redeemed IS NULL THEN RETURN false; END IF;
  PERFORM public.adjust_wallet(p.user_id, p.credits_redeemed, 'cashout_refund', NULL, 'Cash out failed, Credits returned');
  IF p.note ILIKE '%ID check fee%' THEN
    PERFORM set_config('app.trusted_write', 'on', true);
    UPDATE public.profiles SET payout_identity_fee_charged_at = NULL WHERE id = p.user_id;
    PERFORM set_config('app.trusted_write', 'off', true);
  END IF;
  UPDATE public.payout_requests SET status = 'failed', note = left(coalesce(p.note,'') || ' | Failed: ' || coalesce(_reason,''), 900), updated_at = now() WHERE id = p.id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.refund_failed_credit_cashout(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.refund_failed_credit_cashout(uuid, text) TO service_role;