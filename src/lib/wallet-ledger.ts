import { supabase } from "@/integrations/supabase/client";

/**
 * Wallet balance and transaction history now read from the canonical
 * `user_wallets` and `transaction_ledger` tables. Both stay in step with the
 * transactional credit engine through database triggers, so every tip, bounty
 * payout, purchase and subscription grant lands here automatically.
 */

export type SubscriptionTier = "free" | "observer" | "hunter" | "operative";

export type UserWallet = {
  id: string;
  creditBalance: number;
  subscriptionTier: SubscriptionTier;
  updatedAt: string;
};

export type LedgerStatus = "completed" | "pending" | "failed" | (string & {});

export type LedgerEntry = {
  id: string;
  type: string;
  creditChange: number;
  dollarValue: number;
  status: LedgerStatus;
  stripeReferenceId: string | null;
  createdAt: string;
};

const TIERS: SubscriptionTier[] = ["free", "observer", "hunter", "operative"];

const asTier = (value: string | null | undefined): SubscriptionTier =>
  TIERS.includes((value ?? "free") as SubscriptionTier)
    ? ((value ?? "free") as SubscriptionTier)
    : "free";

/** Reads the signed-in member's wallet, creating the row on first visit. */
export async function fetchUserWallet(): Promise<UserWallet | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  // Seeds the wallet row (and mirrors any existing balance) on first read.
  const { error: ensureError } = await supabase.rpc("ensure_user_wallet", {
    _user_id: auth.user.id,
  });
  if (ensureError) throw new Error(ensureError.message);

  const { data, error } = await supabase
    .from("user_wallets")
    .select("id, credit_balance, subscription_tier, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    creditBalance: data.credit_balance ?? 0,
    subscriptionTier: asTier(data.subscription_tier),
    updatedAt: data.updated_at,
  };
}

/** Newest-first transaction history for the signed-in member. */
export async function listLedgerEntries(limit = 30): Promise<LedgerEntry[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("transaction_ledger")
    .select("id, type, credit_change, dollar_value, status, stripe_reference_id, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    type: row.type,
    creditChange: Number(row.credit_change ?? 0),
    dollarValue: Number(row.dollar_value ?? 0),
    status: (row.status ?? "completed") as LedgerStatus,
    stripeReferenceId: row.stripe_reference_id ?? null,
    createdAt: row.created_at,
  }));
}

/** Plain-English label for a ledger row type. */
export function ledgerTypeLabel(type: string): string {
  const known: Record<string, string> = {
    bounty_payout: "Bounty payout",
    direct_tip: "Direct tip",
    credit_purchase: "Credit purchase",
    subscription: "Onlooker+ credits",
    cashout: "Cash out",
    escrow_hold: "Escrow hold",
    escrow_release: "Escrow release",
  };
  return (
    known[type] ??
    type.replace(/_/g, " ").replace(/^./, (character) => character.toUpperCase())
  );
}

export const formatLedgerDollars = (value: number) => `$${Math.abs(value).toFixed(2)}`;

export const formatLedgerWhen = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
