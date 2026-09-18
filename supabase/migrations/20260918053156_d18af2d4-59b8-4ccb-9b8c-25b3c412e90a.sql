-- user_wallets: members get read-only access to their own wallet
DROP POLICY IF EXISTS "Users manage their own wallet" ON public.user_wallets;
CREATE POLICY "Users can view their own wallet"
  ON public.user_wallets FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM authenticated;
REVOKE ALL ON public.user_wallets FROM anon;

-- transaction_ledger: members get read-only access to their own entries
DROP POLICY IF EXISTS "Users manage their own ledger entries" ON public.transaction_ledger;
CREATE POLICY "Users can view their own ledger entries"
  ON public.transaction_ledger FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
REVOKE INSERT, UPDATE, DELETE ON public.transaction_ledger FROM authenticated;
REVOKE ALL ON public.transaction_ledger FROM anon;

-- profiles: members may only update safe, non-privileged columns
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (
  username, display_name, full_name, legal_first_name, legal_last_name,
  avatar_url, onboarded, onboarding_completed, terms_accepted_at,
  is_incognito, alias, updated_at
) ON public.profiles TO authenticated;

-- payout_requests: cash-out inserts must be backed by real wallet balance
DROP POLICY IF EXISTS "Users can request their own cash-out" ON public.payout_requests;
CREATE POLICY "Users can request their own cash-out"
  ON public.payout_requests FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND credits_redeemed > 0
    AND EXISTS (
      SELECT 1 FROM public.user_wallets w
      WHERE w.user_id = auth.uid()
        AND w.credit_balance >= credits_redeemed
    )
  );

-- bounty_pools: creators may edit descriptive fields only, never credit totals or status
REVOKE UPDATE ON public.bounty_pools FROM authenticated;
GRANT UPDATE (title, place, latitude, longitude, expires_at, updated_at)
  ON public.bounty_pools TO authenticated;