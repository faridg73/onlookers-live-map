// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link } from "@tanstack/react-router";
import { Loader2, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useCashoutBalance, holdLabel } from "@/lib/cashout-balance";
import { formatCreditCash } from "@/lib/credits";

/**
 * Compact wallet box: what can actually be cashed out, what is still held, and
 * a Cash Out link. The headline figure must never be the raw wallet total —
 * sitting next to a Cash Out button, that would promise held credits are
 * spendable.
 */
export function WalletSnapshot() {
  const { user } = useAuth();
  const { balance, loading } = useCashoutBalance();

  if (!user) return null;

  return (
    <section className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-live bg-live/10 p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          <Wallet className="size-3.5 text-live" /> Available to cash out
        </p>
        {loading || !balance ? (
          <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />
        ) : (
          <>
            <p className="mt-1 truncate">
              <span className="font-display text-3xl text-foreground">
                {balance.availableCredits.toLocaleString()}
              </span>{" "}
              <span className="text-sm text-muted-foreground">
                credits · {formatCreditCash(balance.availableCredits)}
              </span>
            </p>
            {balance.onHoldCredits > 0 && (
              <p className="mt-0.5 text-xs text-muted-foreground">
                {holdLabel(balance.holdDays)}: {balance.onHoldCredits.toLocaleString()} credits ·
                wallet total {balance.totalCredits.toLocaleString()}
              </p>
            )}
          </>
        )}
      </div>
      <Link
        to="/balance"
        className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-live px-4 text-xs font-bold uppercase tracking-[0.12em] text-background hover:opacity-90"
      >
        Cash Out
      </Link>
    </section>
  );
}
