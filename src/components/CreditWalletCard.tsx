// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, CoinsIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  fetchUserWallet,
  formatLedgerWhen,
  ledgerTypeLabel,
  listLedgerEntries,
  type LedgerEntry,
  type UserWallet,
} from "@/lib/wallet-ledger";

/** Credits balance plus a feed of incoming and outgoing credit movement. */
export function CreditWalletCard() {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nextWallet, nextLedger] = await Promise.all([
        fetchUserWallet(),
        listLedgerEntries(20),
      ]);
      setWallet(nextWallet);
      setLedger(nextLedger);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your credits");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    // Lets the checkout return flow pull in a freshly topped-up balance.
    const onRefresh = () => void refresh();
    window.addEventListener("onlooker:credits-refresh", onRefresh);
    return () => window.removeEventListener("onlooker:credits-refresh", onRefresh);
  }, [refresh]);

  if (loading) {
    return (
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-border bg-surface-raised p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Loading Credits…
      </div>
    );
  }

  if (!wallet) return null;

  const earned = ledger
    .filter((entry) => entry.creditChange > 0)
    .reduce((sum, entry) => sum + entry.creditChange, 0);
  const spent = ledger
    .filter((entry) => entry.creditChange < 0)
    .reduce((sum, entry) => sum + Math.abs(entry.creditChange), 0);

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Credits
        </span>
        <CoinsIcon className="size-4 text-signal" />
      </div>

      <div className="mt-2 flex items-baseline gap-2">
        <span className="font-display text-4xl text-signal">{wallet.creditBalance}</span>
        <span className="text-sm text-muted-foreground">credits</span>
      </div>
      <p className="text-xs text-muted-foreground">
        Send credits to onlookers who film for you,{" "}
        <span className="font-semibold text-signal">20% platform fee</span> applies to each transfer.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl border border-border bg-surface px-3 py-2">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
            Received
          </p>
          <p className="font-display text-lg text-signal">+{earned}</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-3 py-2">
          <p className="text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">Sent</p>
          <p className="font-display text-lg text-foreground">−{spent}</p>
        </div>
      </div>

      <div className="mt-4 space-y-2">
        <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Recent activity
        </p>

        {ledger.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No credit movement yet. Tips and bounty payouts will show up here.
          </p>
        ) : (
          <ul className="space-y-2">
            {ledger.map((entry) => {
              const incoming = entry.creditChange >= 0;
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-xl border border-border bg-surface px-3 py-2.5"
                >
                  <span
                    className={`grid size-8 shrink-0 place-items-center rounded-full ${
                      incoming ? "bg-signal/15 text-signal" : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {incoming ? (
                      <ArrowDownLeft className="size-4" />
                    ) : (
                      <ArrowUpRight className="size-4" />
                    )}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">
                      {ledgerTypeLabel(entry.type)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatLedgerWhen(entry.createdAt)}
                    </p>
                  </div>
                  <span
                    className={`font-display text-base ${
                      incoming ? "text-live" : "text-foreground"
                    }`}
                  >
                    {incoming ? "+" : "−"}
                    {Math.abs(entry.creditChange)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
