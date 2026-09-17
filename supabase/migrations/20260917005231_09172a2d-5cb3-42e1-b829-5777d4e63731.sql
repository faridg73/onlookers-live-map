
-- Dedupe key so backfills and triggers never double-post a ledger row.
ALTER TABLE public.transaction_ledger ADD COLUMN IF NOT EXISTS source_id text;
CREATE UNIQUE INDEX IF NOT EXISTS transaction_ledger_source_id_key
  ON public.transaction_ledger (source_id);
CREATE INDEX IF NOT EXISTS transaction_ledger_user_created_idx
  ON public.transaction_ledger (user_id, created_at DESC);

-- Ensure a wallet row exists for the signed-in member.
CREATE OR REPLACE FUNCTION public.ensure_user_wallet(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, credit_balance)
  SELECT _user_id, COALESCE((
    SELECT w.credit_balance FROM public.user_credit_wallets w WHERE w.user_id = _user_id
  ), 0)
  ON CONFLICT (user_id) DO NOTHING;
END;
$$;

-- Keep the display wallet in step with the transactional wallet.
CREATE OR REPLACE FUNCTION public.sync_user_wallet_balance()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_wallets (user_id, credit_balance)
  VALUES (NEW.user_id, NEW.credit_balance)
  ON CONFLICT (user_id) DO UPDATE
    SET credit_balance = EXCLUDED.credit_balance, updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_user_wallet_balance_trg ON public.user_credit_wallets;
CREATE TRIGGER sync_user_wallet_balance_trg
AFTER INSERT OR UPDATE OF credit_balance ON public.user_credit_wallets
FOR EACH ROW EXECUTE FUNCTION public.sync_user_wallet_balance();

-- Mirror every credit transfer into the ledger for both sides.
CREATE OR REPLACE FUNCTION public.ledger_from_credit_transaction()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_user uuid;
  receiver_user uuid;
BEGIN
  SELECT user_id INTO sender_user FROM public.user_credit_wallets WHERE id = NEW.sender_wallet_id;
  SELECT user_id INTO receiver_user FROM public.user_credit_wallets WHERE id = NEW.receiver_wallet_id;

  IF sender_user IS NOT NULL THEN
    INSERT INTO public.transaction_ledger
      (user_id, type, credit_change, dollar_value, status, source_id)
    VALUES (sender_user, NEW.transaction_type, -NEW.amount_gross,
            ROUND(NEW.amount_gross / 4.0, 2), 'completed', NEW.id::text || ':out')
    ON CONFLICT (source_id) DO NOTHING;
  END IF;

  IF receiver_user IS NOT NULL THEN
    INSERT INTO public.transaction_ledger
      (user_id, type, credit_change, dollar_value, status, source_id)
    VALUES (receiver_user, NEW.transaction_type, NEW.amount_net,
            ROUND(NEW.amount_net / 4.0, 2), 'completed', NEW.id::text || ':in')
    ON CONFLICT (source_id) DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ledger_from_credit_transaction_trg ON public.credit_transactions;
CREATE TRIGGER ledger_from_credit_transaction_trg
AFTER INSERT ON public.credit_transactions
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_credit_transaction();

-- Mirror purchased credit packs into the ledger.
CREATE OR REPLACE FUNCTION public.ledger_from_credit_purchase()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.transaction_ledger
    (user_id, type, credit_change, dollar_value, status, stripe_reference_id, source_id)
  VALUES (NEW.user_id, 'credit_purchase', NEW.credits,
          ROUND(NEW.amount_cents / 100.0, 2), 'completed', NEW.session_id,
          'purchase:' || NEW.id::text)
  ON CONFLICT (source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS ledger_from_credit_purchase_trg ON public.credit_purchases;
CREATE TRIGGER ledger_from_credit_purchase_trg
AFTER INSERT ON public.credit_purchases
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_credit_purchase();

-- Backfill wallets and history.
INSERT INTO public.user_wallets (user_id, credit_balance)
SELECT w.user_id, w.credit_balance FROM public.user_credit_wallets w
ON CONFLICT (user_id) DO UPDATE SET credit_balance = EXCLUDED.credit_balance;

INSERT INTO public.transaction_ledger
  (user_id, type, credit_change, dollar_value, status, source_id, created_at)
SELECT sw.user_id, t.transaction_type, -t.amount_gross,
       ROUND(t.amount_gross / 4.0, 2), 'completed', t.id::text || ':out', t.created_at
FROM public.credit_transactions t
JOIN public.user_credit_wallets sw ON sw.id = t.sender_wallet_id
ON CONFLICT (source_id) DO NOTHING;

INSERT INTO public.transaction_ledger
  (user_id, type, credit_change, dollar_value, status, source_id, created_at)
SELECT rw.user_id, t.transaction_type, t.amount_net,
       ROUND(t.amount_net / 4.0, 2), 'completed', t.id::text || ':in', t.created_at
FROM public.credit_transactions t
JOIN public.user_credit_wallets rw ON rw.id = t.receiver_wallet_id
ON CONFLICT (source_id) DO NOTHING;

INSERT INTO public.transaction_ledger
  (user_id, type, credit_change, dollar_value, status, stripe_reference_id, source_id, created_at)
SELECT p.user_id, 'credit_purchase', p.credits, ROUND(p.amount_cents / 100.0, 2),
       'completed', p.session_id, 'purchase:' || p.id::text, p.created_at
FROM public.credit_purchases p
ON CONFLICT (source_id) DO NOTHING;
