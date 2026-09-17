
REVOKE EXECUTE ON FUNCTION public.sync_user_wallet_balance() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ledger_from_credit_transaction() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ledger_from_credit_purchase() FROM anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.ensure_user_wallet(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_wallet(uuid) TO authenticated;
