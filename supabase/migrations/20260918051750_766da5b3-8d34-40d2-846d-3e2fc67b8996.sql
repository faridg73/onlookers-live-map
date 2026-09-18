-- Wallets: members may view their own wallet only; balances change exclusively through trusted server processes (payments webhooks, credit RPCs)
REVOKE INSERT, UPDATE, DELETE ON public.user_wallets FROM authenticated;
GRANT SELECT ON public.user_wallets TO authenticated;

-- Ledger: members may view their own history only; entries are written exclusively by trusted server processes
REVOKE INSERT, UPDATE, DELETE ON public.transaction_ledger FROM authenticated;
GRANT SELECT ON public.transaction_ledger TO authenticated;

-- Bounty videos: members may upload and delete their own clips, but never change payout, acceptance, or visibility fields
REVOKE UPDATE ON public.bounty_videos FROM authenticated;

-- Profiles: members may edit only safe, self-descriptive fields; credits, verification, reputation, and moderation fields are server-managed
REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (username, display_name, full_name, legal_first_name, legal_last_name, avatar_url, onboarded, onboarding_completed, terms_accepted_at, is_incognito, alias, updated_at) ON public.profiles TO authenticated;
