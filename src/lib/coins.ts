import { supabase } from "@/integrations/supabase/client";

export type CoinTransactionType = "bounty_payout" | "direct_tip" | "coin_purchase";

export type CoinWallet = {
  id: string;
  coinBalance: number;
  updatedAt: string;
};

export type CoinLedgerEntry = {
  id: string;
  direction: "in" | "out";
  amountGross: number;
  amountNet: number;
  amountFee: number;
  type: CoinTransactionType;
  requestId: string | null;
  createdAt: string;
};

/** Platform cut kept from every coin movement. */
export const PLATFORM_FEE_RATE = 0.2;

/** Reads the signed-in member's Looker Coins wallet, creating it on first visit. */
export async function fetchCoinWallet(): Promise<CoinWallet | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { error: ensureError } = await supabase.rpc("ensure_coin_wallet", {});
  if (ensureError) throw new Error(ensureError.message);

  const { data, error } = await supabase
    .from("user_wallets")
    .select("id, coin_balance, updated_at")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;

  return {
    id: data.id,
    coinBalance: data.coin_balance,
    updatedAt: data.updated_at,
  };
}

/** Recent coin movements for this wallet, newest first, tagged incoming or outgoing. */
export async function listCoinTransactions(
  walletId: string,
  limit = 25,
): Promise<CoinLedgerEntry[]> {
  const { data, error } = await supabase
    .from("coin_transactions")
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
    type: row.transaction_type as CoinTransactionType,
    requestId: row.request_id,
    createdAt: row.created_at,
  }));
}

/**
 * Atomically moves coins from the signed-in member to another member:
 * balance check, debit, 20% platform fee, credit of the net amount, ledger entry.
 */
export async function tipCoins(options: {
  receiverId: string;
  amount: number;
  type?: Exclude<CoinTransactionType, "coin_purchase">;
  requestId?: string | null;
}): Promise<{ senderBalance: number; amountNet: number; amountFee: number }> {
  const { data, error } = await supabase.rpc("tip_coins", {
    _receiver_id: options.receiverId,
    _amount: Math.round(options.amount),
    _transaction_type: options.type ?? "direct_tip",
    ...(options.requestId ? { _request_id: options.requestId } : {}),
  });

  if (error) {
    if (/insufficient coins/i.test(error.message)) throw new Error("Insufficient Coins");
    throw new Error(error.message);
  }

  const row = Array.isArray(data) ? data[0] : data;
  return {
    senderBalance: Number(row?.sender_balance ?? 0),
    amountNet: Number(row?.amount_net ?? 0),
    amountFee: Number(row?.amount_platform_fee ?? 0),
  };
}

export const COIN_LABELS: Record<CoinTransactionType, string> = {
  bounty_payout: "Bounty payout",
  direct_tip: "Direct tip",
  coin_purchase: "Coin purchase",
};

/* ------------------------------------------------------------------
 * Looker Coins are now the only in-app currency. Every bounty, chip-in,
 * tip and reward payout is denominated in whole coins; dollars appear
 * only when buying coins by card or cashing coins out to a bank.
 * ------------------------------------------------------------------ */

/** Fixed conversion used everywhere money is shown or settled. */
export const COINS_PER_USD = 4;

/** Smallest bounty anyone can post. */
export const MIN_BOUNTY_COINS = 20;

/** Micro-tip sent from the global feed. */
export const MICRO_TIP_COINS = 2;

export const coinsToUsdValue = (coins: number) =>
  Math.round((coins / COINS_PER_USD) * 100) / 100;

export const usdToCoins = (usd: number) => Math.round(usd * COINS_PER_USD);

/** Compact badge form, e.g. "120 LC". */
export const formatCoins = (coins: number) =>
  `${Math.round(Number.isFinite(coins) ? coins : 0).toLocaleString()} LC`;

/** Spelled-out form for sentences, e.g. "120 Looker Coins". */
export const formatCoinWords = (coins: number) => {
  const n = Math.round(Number.isFinite(coins) ? coins : 0);
  return `${n.toLocaleString()} Looker Coin${n === 1 ? "" : "s"}`;
};

/** Cash equivalent, e.g. "$12.00". */
export const formatCoinCash = (coins: number) => `$${coinsToUsdValue(coins).toFixed(2)}`;
