ALTER TABLE public.wallet_transactions
  DROP CONSTRAINT IF EXISTS wallet_transactions_kind_check;

ALTER TABLE public.wallet_transactions
  ADD CONSTRAINT wallet_transactions_kind_check
  CHECK (kind = ANY (ARRAY[
    'topup','escrow_hold','escrow_refund','bounty_payout','withdrawal',
    'credit_purchase','tip_sent','tip_received','credit_cashout','cashout',
    'post_boost','stream_minute','stream_earning'
  ]));