// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { CREDITS_PER_USD, PLATFORM_FEE_RATE, creditsToUsdValue } from "@/lib/credits";
import { fetchCashoutBalance, holdLabel } from "@/lib/cashout-balance";

export { CREDITS_PER_USD, PLATFORM_FEE_RATE, creditsToUsdValue, holdLabel };

/** The only ledger entries that count as money earned as an onlooker. */
export const EARNING_TYPES = ["bounty_payout", "direct_tip"];

export type EarningsSummary = {
  /** Credits earned before the platform fee. */
  grossCredits: number;
  /** The 15% platform fee taken out of those earnings. */
  feeCredits: number;
  /** Credits actually paid into the wallet. */
  netCredits: number;
  /** How many payouts/earning events make up the total. */
  entries: number;
  /** Credits that can actually be cashed out right now (holds excluded). */
  availableCredits: number;
  /** Credits still inside a security hold and not yet spendable. */
  onHoldCredits: number;
  /** Real length of the active hold in days (3 normally, 7 when flagged). */
  holdDays: number | null;

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
  holdDays: null,

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
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  // Available / on-hold figures come from the one shared calculation so this
  // breakdown can never disagree with the payout dashboard or wallet boxes.
  const cashout = await fetchCashoutBalance();
  const summary: EarningsSummary = {
    ...EMPTY,
    availableCredits: cashout.availableCredits,
    onHoldCredits: cashout.onHoldCredits,
    holdDays: cashout.holdDays,
  };


  if (wallet?.id) {
    // Earned as an onlooker = bounty payouts + tips received. Purchases,
    // refunds and test top-ups are balance, not earnings (same rule as Profile).
    const { data: rows } = await supabase
      .from("credit_transactions")
      .select("amount_gross, amount_platform_fee, amount_net")
      .eq("receiver_wallet_id", wallet.id)
      .in("transaction_type", EARNING_TYPES);

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
