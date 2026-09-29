// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Loader2, Wallet } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { fetchUserWallet } from "@/lib/wallet-ledger";
import { formatCreditCash } from "@/lib/credits";

/** Compact wallet: credit balance, its cash value and a Cash Out link. */
export function WalletSnapshot() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () =>
      fetchUserWallet()
        .then((w) => alive && setBalance(w?.creditBalance ?? 0))
        .catch(() => alive && setBalance(0));
    void load();
    window.addEventListener("onlooker:credits-refresh", load);
    return () => {
      alive = false;
      window.removeEventListener("onlooker:credits-refresh", load);
    };
  }, [user]);

  if (!user) return null;

  return (
    <section className="mt-4 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-live bg-live/10 p-4">
      <div className="min-w-0">
        <p className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          <Wallet className="size-3.5 text-live" /> Wallet balance
        </p>
        {balance === null ? (
          <Loader2 className="mt-2 size-4 animate-spin text-muted-foreground" />
        ) : (
          <p className="mt-1 truncate">
            <span className="font-display text-3xl text-foreground">{balance.toLocaleString()}</span>{" "}
            <span className="text-sm text-muted-foreground">credits · {formatCreditCash(balance)}</span>
          </p>
        )}
      </div>
      <Link
        to="/balance"
        className="inline-flex min-h-10 shrink-0 items-center rounded-full bg-live px-4 text-xs font-bold uppercase tracking-[0.12em] text-live-foreground hover:opacity-90"
      >
        Cash Out
      </Link>
    </section>
  );
}
