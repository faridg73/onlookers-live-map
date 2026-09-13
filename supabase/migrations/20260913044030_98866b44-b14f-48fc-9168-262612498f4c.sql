ALTER TABLE public.coin_transactions
  DROP CONSTRAINT IF EXISTS coin_transactions_transaction_type_check;

ALTER TABLE public.coin_transactions
  ADD CONSTRAINT coin_transactions_transaction_type_check
  CHECK (transaction_type = ANY (ARRAY['bounty_payout'::text, 'direct_tip'::text, 'coin_purchase'::text, 'coin_cashout'::text]));