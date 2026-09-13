import { supabase } from "@/integrations/supabase/client";
import { CREDITS_PER_USD, creditsToUsdValue } from "@/lib/credits";

export { CREDITS_PER_USD };

/** Cash out is only allowed from 40 credits ($10.00) up. */
export const MIN_CASHOUT_CREDITS = 40;

export const creditsToUsd = creditsToUsdValue;

export type PayoutRequestRow = {
  id: string;
  creditsRedeemed: number;
  cashAmountUsd: number;
  status: "pending" | "processing" | "completed" | "failed" | string;
  stripeTransferId: string | null;
  createdAt: string;
};

/** Cash-out history for the signed-in member, newest first. */
export async function listCreditPayouts(limit = 20): Promise<PayoutRequestRow[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, credits_redeemed, cash_amount_usd, status, stripe_transfer_id, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    creditsRedeemed: row.credits_redeemed,
    cashAmountUsd: Number(row.cash_amount_usd),
    status: row.status,
    stripeTransferId: row.stripe_transfer_id,
    createdAt: row.created_at,
  }));
}

/**
 * Redeems credits for cash in one atomic step: the balance check, the credit
 * deduction and the pending payout record all happen together, so credits can
 * never be spent twice or vanish without a payout row.
 */
export async function requestCreditCashout(credits: number): Promise<string> {
  const { data, error } = await supabase.rpc("request_credit_cashout", {
    _credits: Math.round(credits),
  });
  if (error) {
    if (/insufficient credits/i.test(error.message)) throw new Error("Insufficient Credits");
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
