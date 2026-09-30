// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { CREDITS_PER_USD, PLATFORM_FEE_RATE, creditsToUsdValue } from "@/lib/credits";

export { CREDITS_PER_USD, PLATFORM_FEE_RATE, creditsToUsdValue };

export type EarningsSummary = {
  /** Credits earned before the platform fee. */
  grossCredits: number;
  /** The 20% platform fee taken out of those earnings. */
  feeCredits: number;
  /** Credits actually paid into the wallet. */
  netCredits: number;
  /** How many payouts/earning events make up the total. */
  entries: number;
  /** Credits that can actually be cashed out right now (holds excluded). */
  availableCredits: number;
  /** Credits still inside a security hold and not yet spendable. */
  onHoldCredits: number;
  /** Credits already redeemed for cash (completed payouts). */
  cashedOutCredits: number;
  cashedOutUsd: number;
  /** Credits in payouts still being processed. */
  pendingCredits: number;
  pendingUsd: number;
};

const EMPTY: EarningsSummary = {
  grossCredits: 0,
  feeCredits: 0,
  netCredits: 0,
  entries: 0,
  availableCredits: 0,
  onHoldCredits: 0,
  cashedOutCredits: 0,
  cashedOutUsd: 0,
  pendingCredits: 0,
  pendingUsd: 0,
};

/**
 * Lifetime earnings for the signed-in member, read straight from the credit
 * ledger so the numbers always match what was actually paid.
 */
export async function fetchMyEarnings(): Promise<EarningsSummary> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return EMPTY;

  const { data: wallet } = await supabase
    .from("user_credit_wallets")
    .select("id, credit_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const balance = wallet?.credit_balance ?? 0;
  const summary: EarningsSummary = { ...EMPTY, availableCredits: balance };

  // The wallet balance still contains credits inside a security hold, so the
  // Earn tab must subtract them. The cash-out status is the preferred source,
  // but a failed or empty response used to silently fall back to the full
  // balance and over-report what was spendable. The ledger is read directly as
  // a second opinion, and the larger hold always wins: this figure is never
  // allowed to exceed the amount that can actually be withdrawn.
  let held = 0;
  const { data: cashout, error: cashoutError } = await supabase.rpc("my_cashout_status" as never);
  const status = cashout as { on_hold?: number } | null;
  if (status && typeof status.on_hold === "number") held = Number(status.on_hold) || 0;
  if (cashoutError) console.warn("[earnings] cash-out status unavailable", cashoutError.message);

  if (wallet?.id) {
    const { data: pending } = await supabase
      .from("credit_transactions")
      .select("amount_net, available_at")
      .eq("receiver_wallet_id", wallet.id)
      .gt("available_at", new Date().toISOString());
    const ledgerHeld = (pending ?? []).reduce((sum, row) => sum + Number(row.amount_net ?? 0), 0);
    held = Math.max(held, ledgerHeld);
  }

  summary.onHoldCredits = Math.min(Math.max(Math.round(held), 0), balance);
  summary.availableCredits = Math.max(balance - summary.onHoldCredits, 0);

  if (wallet?.id) {
    const { data: rows } = await supabase
      .from("credit_transactions")
      .select("amount_gross, amount_platform_fee, amount_net")
      .eq("receiver_wallet_id", wallet.id);

    for (const row of rows ?? []) {
      summary.grossCredits += Number(row.amount_gross ?? 0);
      summary.feeCredits += Number(row.amount_platform_fee ?? 0);
      summary.netCredits += Number(row.amount_net ?? 0);
      summary.entries += 1;
    }
  }

  const { data: payouts } = await supabase
    .from("payout_requests")
    .select("credits_redeemed, cash_amount_usd, status")
    .eq("user_id", userId);

  for (const payout of payouts ?? []) {
    const credits = Number(payout.credits_redeemed ?? 0);
    const usd = Number(payout.cash_amount_usd ?? 0);
    if (payout.status === "completed" || payout.status === "paid") {
      summary.cashedOutCredits += credits;
      summary.cashedOutUsd += usd;
    } else if (payout.status === "pending" || payout.status === "processing") {
      summary.pendingCredits += credits;
      summary.pendingUsd += usd;
    }
  }

  return summary;
}

export const usd = (amount: number) => `$${amount.toFixed(2)}`;
