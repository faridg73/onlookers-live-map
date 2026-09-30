// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

/**
 * The single source of truth for "how many credits can actually be cashed out".
 *
 * The wallet balance still contains credits sitting inside a security hold, so
 * no screen may ever present the raw wallet total as spendable. Every surface
 * that shows an available / on-hold figure reads it from here, which is the
 * only way the numbers can be guaranteed to agree.
 */
export type CashoutBalance = {
  /** Every credit in the wallet, held ones included. */
  totalCredits: number;
  /** Credits that can be withdrawn right now. */
  availableCredits: number;
  /** Credits still inside a security hold. */
  onHoldCredits: number;
  /** Real length of the longest active hold, in days (3 normally, 7 when flagged). */
  holdDays: number | null;
  /** When the next held batch clears. */
  nextReleaseAt: string | null;
  frozenAt: string | null;
  cooldownUntil: string | null;
  testMode: boolean;
};

export const EMPTY_CASHOUT_BALANCE: CashoutBalance = {
  totalCredits: 0,
  availableCredits: 0,
  onHoldCredits: 0,
  holdDays: null,
  nextReleaseAt: null,
  frozenAt: null,
  cooldownUntil: null,
  testMode: false,
};

type CashoutStatusRow = {
  balance?: number | string;
  on_hold?: number | string;
  available?: number | string;
  next_release_at?: string | null;
  frozen_at?: string | null;
  cooldown_until?: string | null;
  test_mode?: boolean | null;
};

/**
 * Reads the authoritative cash-out status and cross-checks it against the
 * credit ledger. Values arrive as JSON, so they are coerced rather than
 * type-checked (a string "39" used to be ignored, which silently reported the
 * whole wallet as spendable) and the largest hold always wins, so a screen can
 * never over-report what is withdrawable.
 */
export async function fetchCashoutBalance(): Promise<CashoutBalance> {
  const { data: auth } = await supabase.auth.getUser();
  const userId = auth.user?.id;
  if (!userId) return EMPTY_CASHOUT_BALANCE;

  const { data: wallet } = await supabase
    .from("user_credit_wallets")
    .select("id, credit_balance")
    .eq("user_id", userId)
    .maybeSingle();

  const total = Number(wallet?.credit_balance ?? 0);
  const result: CashoutBalance = { ...EMPTY_CASHOUT_BALANCE, totalCredits: total };

  let held = 0;
  const { data: statusData, error: statusError } = await supabase.rpc(
    "my_cashout_status" as never,
  );
  const status = statusData as CashoutStatusRow | null;
  if (status) {
    const statusHeld = Number(status.on_hold);
    if (Number.isFinite(statusHeld)) held = Math.max(held, statusHeld);
    const statusAvailable = Number(status.available);
    if (Number.isFinite(statusAvailable)) held = Math.max(held, total - statusAvailable);
    result.nextReleaseAt = status.next_release_at ?? null;
    result.frozenAt = status.frozen_at ?? null;
    result.cooldownUntil = status.cooldown_until ?? null;
    result.testMode = Boolean(status.test_mode);
  }
  if (statusError) {
    console.warn("[cashout] status unavailable", statusError.message);
  }

  // Second opinion straight from the ledger, plus the real hold length: a
  // normal hold is 3 days but a payout flagged by the self-dealing checks is
  // held for 7, and the label has to state the true figure.
  if (wallet?.id) {
    const { data: pending } = await supabase
      .from("credit_transactions")
      .select("amount_net, created_at, available_at")
      .eq("receiver_wallet_id", wallet.id)
      .gt("available_at", new Date().toISOString());

    const rows = pending ?? [];
    const ledgerHeld = rows.reduce((sum, row) => sum + Number(row.amount_net ?? 0), 0);
    held = Math.max(held, ledgerHeld);

    const lengths = rows
      .map((row) => {
        if (!row.created_at || !row.available_at) return 0;
        const ms = new Date(row.available_at).getTime() - new Date(row.created_at).getTime();
        return Math.round(ms / 86_400_000);
      })
      .filter((days) => days > 0);
    result.holdDays = lengths.length ? Math.max(...lengths) : null;

    if (!result.nextReleaseAt) {
      const soonest = rows
        .map((row) => row.available_at)
        .filter((value): value is string => Boolean(value))
        .sort()[0];
      result.nextReleaseAt = soonest ?? null;
    }
  }

  result.onHoldCredits = Math.min(Math.max(Math.round(held), 0), total);
  result.availableCredits = Math.max(total - result.onHoldCredits, 0);
  return result;
}

/** Human wording for a hold whose length can change when a payout is flagged. */
export function holdLabel(holdDays: number | null) {
  return holdDays ? `On hold (${holdDays}-day security review)` : "On hold (security review)";
}

/**
 * Live cash-out balance for a component. Refreshes with the app-wide credit
 * refresh event so every screen showing a balance moves together.
 */
export function useCashoutBalance() {
  const [balance, setBalance] = useState<CashoutBalance | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    const load = () => {
      void fetchCashoutBalance()
        .then((next) => {
          if (alive) setBalance(next);
        })
        .catch(() => {
          if (alive) setBalance(EMPTY_CASHOUT_BALANCE);
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    };

    load();
    window.addEventListener("onlooker:credits-refresh", load);
    const { data: sub } = supabase.auth.onAuthStateChange(() => load());
    return () => {
      alive = false;
      window.removeEventListener("onlooker:credits-refresh", load);
      sub.subscription.unsubscribe();
    };
  }, []);

  return { balance, loading, reload: fetchCashoutBalance };
}
