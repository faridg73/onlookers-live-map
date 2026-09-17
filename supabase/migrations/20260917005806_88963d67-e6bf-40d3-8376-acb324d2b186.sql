
CREATE OR REPLACE FUNCTION public.ledger_from_topup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.transaction_ledger
    (user_id, type, credit_change, dollar_value, status, stripe_reference_id, source_id)
  VALUES (NEW.user_id, 'credit_topup', ROUND(NEW.amount)::int,
          ROUND(NEW.amount / 4.0, 2), 'completed', NEW.session_id,
          'topup:' || NEW.id::text)
  ON CONFLICT (source_id) DO NOTHING;
  RETURN NEW;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.ledger_from_topup() FROM anon, authenticated;

DROP TRIGGER IF EXISTS ledger_from_topup_trg ON public.topups;
CREATE TRIGGER ledger_from_topup_trg
AFTER INSERT ON public.topups
FOR EACH ROW EXECUTE FUNCTION public.ledger_from_topup();

INSERT INTO public.transaction_ledger
  (user_id, type, credit_change, dollar_value, status, stripe_reference_id, source_id, created_at)
SELECT t.user_id, 'credit_topup', ROUND(t.amount)::int, ROUND(t.amount / 4.0, 2),
       'completed', t.session_id, 'topup:' || t.id::text, t.created_at
FROM public.topups t
ON CONFLICT (source_id) DO NOTHING;
