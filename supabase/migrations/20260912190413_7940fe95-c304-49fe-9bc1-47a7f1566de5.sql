REVOKE ALL ON FUNCTION public.notify_nearby_hunters() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.sync_wallet_balance_from_video() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.request_earnings_payout(numeric, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.request_earnings_payout(numeric, text) TO authenticated;