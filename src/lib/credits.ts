import { supabase } from "@/integrations/supabase/client";

export type CreditTransactionType = "bounty_payout" | "direct_tip" | "credit_purchase";

export type CreditWallet = {
  id: string;
  creditBalance: number;
  updatedAt: string;
};

export type CreditLedgerEntry = {
  id: string;
  direction: "in" | "out";
  amountGross: number;
  amountNet: number;
  amountFee: number;
  type: CreditTransactionType;
  requestId: string | null;
  createdAt: string;
};

/** Platform cut kept from every credit movement. */
export const PLATFORM_FEE_RATE = 0.2;

/** Reads the signed-in member's Looker Credits wallet, creating it on first visit. */
export async function fetchCreditWallet(): Promise<CreditWallet | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { error: ensureError } = await supabase.rpc("ensure_credit_wallet", {});
  if (ensureError) throw new Error(ensureError.message);

  const { data, error } = await supabase
    .from("user_credit_wallets")
    .select("id, credit_balance, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    creditBalance: data.credit_balance,
    updatedAt: data.updated_at,
  };
}

/** Recent credit movements for this wallet, newest first, tagged incoming or outgoing. */
export async function listCreditTransactions(
  walletId: string,
  limit = 25,
): Promise<CreditLedgerEntry[]> {
  const { data, error } = await supabase
    .from("credit_transactions")
    .select(
      "id, sender_wallet_id, receiver_wallet_id, request_id, amount_gross, amount_platform_fee, amount_net, transaction_type, created_at",
    )
    .or(`sender_wallet_id.eq.${walletId},receiver_wallet_id.eq.${walletId}`)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    direction: row.receiver_wallet_id === walletId ? "in" : "out",
    amountGross: row.amount_gross,
    amountNet: row.amount_net,
    amountFee: row.amount_platform_fee,
    type: row.transaction_type as CreditTransactionType,
    requestId: row.request_id,
    createdAt: row.created_at,
  }));
}

/**
 * Atomically moves credits from the signed-in member to another member:
 * balance check, debit, 20% platform fee, credit of the net amount, ledger entry.
 */
export async function tipCredits(options: {
  receiverId: string;
  amount: number;
  type?: Exclude<CreditTransactionType, "credit_purchase">;
  requestId?: string | null;
}): Promise<{ senderBalance: number; amountNet: number; amountFee: number }> {
  const { data, error } = await supabase.rpc("tip_credits", {
    _receiver_id: options.receiverId,
    _amount: Math.round(options.amount),
    _transaction_type: options.type ?? "direct_tip",
    ...(options.requestId ? { _request_id: options.requestId } : {}),
  });

  if (error) {
    if (/insufficient credits/i.test(error.message)) throw new Error("Insufficient Credits");
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    senderBalance: Number(row?.sender_balance ?? 0),
    amountNet: Number(row?.amount_net ?? 0),
    amountFee: Number(row?.amount_platform_fee ?? 0),
  };
}

export const CREDIT_LABELS: Record<CreditTransactionType, string> = {
  bounty_payout: "Bounty payout",
  direct_tip: "Direct tip",
  credit_purchase: "Credit purchase",
};

/* ------------------------------------------------------------------
 * Looker Credits are now the only in-app currency. Every bounty, chip-in,
 * tip and reward payout is denominated in whole credits; dollars appear
 * only when buying credits by card or cashing credits out to a bank.
 * ------------------------------------------------------------------ */

/** Fixed conversion used everywhere money is shown or settled. */
export const CREDITS_PER_USD = 4;

/** Smallest bounty anyone can post. */
export const MIN_BOUNTY_CREDITS = 20;

/** Micro-tip sent from the global feed. */
export const MICRO_TIP_CREDITS = 2;

export const creditsToUsdValue = (credits: number) =>
  Math.round((credits / CREDITS_PER_USD) * 100) / 100;

export const usdToCredits = (usd: number) => Math.round(usd * CREDITS_PER_USD);

/** Compact badge form, e.g. "120 Credits". */
export const formatCredits = (credits: number) =>
  `${Math.round(Number.isFinite(credits) ? credits : 0).toLocaleString()} Credits`;

/** Spelled-out form for sentences, e.g. "120 Looker Credits". */
export const formatCreditWords = (credits: number) => {
  const n = Math.round(Number.isFinite(credits) ? credits : 0);
  return `${n.toLocaleString()} Looker Credit${n === 1 ? "" : "s"}`;
};

/** Cash equivalent, e.g. "$12.00". */
export const formatCreditCash = (credits: number) => `$${creditsToUsdValue(credits).toFixed(2)}`;
