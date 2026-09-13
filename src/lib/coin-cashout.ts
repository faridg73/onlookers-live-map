import { supabase } from "@/integrations/supabase/client";
import { COINS_PER_USD, coinsToUsdValue } from "@/lib/coins";

export { COINS_PER_USD };

/** Cash out is only allowed from 40 coins ($10.00) up. */
export const MIN_CASHOUT_COINS = 40;

export const coinsToUsd = coinsToUsdValue;

export type PayoutRequestRow = {
  id: string;
  coinsRedeemed: number;
  cashAmountUsd: number;
  status: "pending" | "processing" | "completed" | "failed" | string;
  stripeTransferId: string | null;
  createdAt: string;
};

/** Cash-out history for the signed-in member, newest first. */
export async function listCoinPayouts(limit = 20): Promise<PayoutRequestRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, coins_redeemed, cash_amount_usd, status, stripe_transfer_id, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    coinsRedeemed: row.coins_redeemed,
    cashAmountUsd: Number(row.cash_amount_usd),
    status: row.status,
    stripeTransferId: row.stripe_transfer_id,
    createdAt: row.created_at,
  }));
}

/**
 * Redeems coins for cash in one atomic step: the balance check, the coin
 * deduction and the pending payout record all happen together, so coins can
 * never be spent twice or vanish without a payout row.
 */
export async function requestCoinCashout(coins: number): Promise<string> {
  const { data, error } = await supabase.rpc("request_coin_cashout", {
    _coins: Math.round(coins),
  });
  if (error) {
    if (/insufficient coins/i.test(error.message)) throw new Error("Insufficient Coins");
    throw new Error(error.message);
  }
  return String(data);
}

export const PAYOUT_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  paid: "Completed",
};
