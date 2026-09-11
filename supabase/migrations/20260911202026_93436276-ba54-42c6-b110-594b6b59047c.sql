CREATE OR REPLACE FUNCTION public.resolve_dispute(_request_id uuid, _award_spotter boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE e RECORD; fee numeric; net numeric;
BEGIN
  IF NOT public.is_review_staff(auth.uid()) THEN RAISE EXCEPTION 'Moderators only'; END IF;

  SELECT * INTO e FROM public.escrows WHERE request_id = _request_id AND status = 'disputed' FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'No open dispute for this request'; END IF;

  IF _award_spotter THEN
    fee := ROUND(e.amount * 0.15, 2);
    net := e.amount - fee;
    IF net > 0 THEN
      PERFORM public.adjust_wallet(e.spotter_id, net, 'bounty_payout', e.request_id, 'Bounty earned (dispute settled)');
    END IF;
    INSERT INTO public.platform_earnings (request_id, spotter_id, gross_amount, fee_amount)
    VALUES (e.request_id, e.spotter_id, e.amount, fee);
    UPDATE public.escrows SET status = 'released', updated_at = now() WHERE id = e.id;
    UPDATE public.claims SET status = 'approved' WHERE request_id = e.request_id AND status <> 'approved';
    UPDATE public.requests SET status = 'completed' WHERE id = e.request_id;
  ELSE
    IF e.amount > 0 THEN
      PERFORM public.adjust_wallet(e.requester_id, e.amount, 'escrow_refund', e.request_id, 'Dispute settled - bounty refunded');
    END IF;
    UPDATE public.escrows SET status = 'refunded', updated_at = now() WHERE id = e.id;
    UPDATE public.requests SET status = 'expired' WHERE id = _request_id AND status <> 'completed';
  END IF;
  RETURN true;
END;
$function$;