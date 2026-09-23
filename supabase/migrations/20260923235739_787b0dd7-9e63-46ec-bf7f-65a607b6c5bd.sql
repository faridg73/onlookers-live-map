-- 1) Stop credit purchases from writing a second history row
CREATE OR REPLACE FUNCTION public.ledger_from_credit_transaction()
 RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
DECLARE sender_user uuid; receiver_user uuid;
BEGIN
  -- credit_purchases already writes its own ledger row
  IF NEW.transaction_type = 'credit_purchase' THEN RETURN NEW; END IF;
  SELECT user_id INTO sender_user FROM public.user_credit_wallets WHERE id = NEW.sender_wallet_id;
  SELECT user_id INTO receiver_user FROM public.user_credit_wallets WHERE id = NEW.receiver_wallet_id;
  IF sender_user IS NOT NULL THEN
    INSERT INTO public.transaction_ledger (user_id, type, credit_change, dollar_value, status, source_id)
    VALUES (sender_user, NEW.transaction_type, -NEW.amount_gross, ROUND(NEW.amount_gross / 4.0, 2), 'completed', NEW.id::text || ':out')
    ON CONFLICT (source_id) DO NOTHING;
  END IF;
  IF receiver_user IS NOT NULL THEN
    INSERT INTO public.transaction_ledger (user_id, type, credit_change, dollar_value, status, source_id)
    VALUES (receiver_user, NEW.transaction_type, NEW.amount_net, ROUND(NEW.amount_net / 4.0, 2), 'completed', NEW.id::text || ':in')
    ON CONFLICT (source_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$function$;

-- Remove the existing duplicate history rows (balances were never doubled)
DELETE FROM public.transaction_ledger WHERE type = 'credit_purchase' AND source_id LIKE '%:in';

-- 2) Clear this account's expired test bounties without re-refunding anything
ALTER TABLE public.requests DISABLE TRIGGER USER;
CREATE TEMP TABLE _old_req AS
  SELECT id FROM public.requests
  WHERE requester_id = 'ab0019bd-850b-403f-813b-9405a0a3c9ac' AND status = 'expired';
UPDATE public.wallet_transactions SET request_id = NULL WHERE request_id IN (SELECT id FROM _old_req);
UPDATE public.credit_transactions SET request_id = NULL WHERE request_id IN (SELECT id FROM _old_req);
UPDATE public.platform_earnings SET request_id = NULL WHERE request_id IN (SELECT id FROM _old_req);
UPDATE public.stream_sessions SET request_id = NULL WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.escrows WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.claims WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.media_uploads WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.ratings WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.request_access_codes WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.request_site_pins WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.dispute_evidence WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.dispute_resolutions WHERE request_id IN (SELECT id FROM _old_req);
DELETE FROM public.requests WHERE id IN (SELECT id FROM _old_req);
ALTER TABLE public.requests ENABLE TRIGGER USER;