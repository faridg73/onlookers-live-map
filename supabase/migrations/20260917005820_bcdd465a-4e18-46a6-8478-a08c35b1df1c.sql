
REVOKE ALL ON FUNCTION public.ledger_from_topup() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.sync_user_wallet_balance() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ledger_from_credit_transaction() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ledger_from_credit_purchase() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.ensure_user_wallet(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ensure_user_wallet(uuid) TO authenticated;
