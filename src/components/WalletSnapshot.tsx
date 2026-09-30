// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link } from "@tanstack/react-router";
import { Loader2, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useCashoutBalance } from "@/lib/cashout-balance";
import { formatCreditCash } from "@/lib/credits";

/**
 * One-row wallet strip: what can actually be cashed out plus a Cash Out link.
 * The figure must never be the raw wallet total — held credits aren't spendable.
 */
export function WalletSnapshot() {
  const { user } = useAuth();
  const { balance, loading } = useCashoutBalance();

  if (!user) return null;

  return (
    <section className="mt-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-live bg-live/10 px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <Wallet className="size-4 shrink-0 text-live" aria-hidden />
        {loading || !balance ? (
          <Loader2 className="size-4 animate-spin text-muted-foreground" />
        ) : (
          <p className="min-w-0 truncate text-sm">
            <span className="font-display text-lg text-foreground">
              {balance.availableCredits.toLocaleString()}
            </span>{" "}
            <span className="text-xs text-muted-foreground">
              available · {formatCreditCash(balance.availableCredits)}
            </span>
          </p>
        )}
      </div>
      <Link
        to="/balance"
        className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-live px-4 text-xs font-bold uppercase tracking-[0.12em] text-background hover:opacity-90"
      >
        Cash Out
      </Link>
    </section>
  );
}
