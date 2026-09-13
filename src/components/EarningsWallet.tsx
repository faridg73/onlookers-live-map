import { useCallback, useEffect, useState } from "react";
import { Clock3, Loader2, TrendingUp, Wallet } from "lucide-react";
import { toast } from "sonner";

import {
  fetchWalletBalance,
  listMyPayoutRequests,
  requestEarningsPayout,
  type PayoutRequest,
  type WalletBalance,
} from "@/lib/wallet";
import { formatCoinCash, formatCoins } from "@/lib/coins";

const money = (n: number) => formatCoins(n);

/** Hunter earnings: available, pending clearance, lifetime, plus payout requests. */
export function EarningsWallet() {
  const [balance, setBalance] = useState<WalletBalance | null>(null);
  const [history, setHistory] = useState<PayoutRequest[]>([]);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const next = await fetchWalletBalance();
    setBalance(next);
    if (next) setHistory(await listMyPayoutRequests());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!balance) return null;

  async function submit() {
    if (balance!.available <= 0) {
      toast.error("You have nothing available to pay out yet.");
      return;
    }
    setBusy(true);
    try {
      await requestEarningsPayout(balance!.available);
      toast.success(`Payout request for ${money(balance!.available)} sent for review.`);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not file the payout request");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Earnings wallet
        </span>
        <Wallet className="size-4 text-signal" />
      </div>

      <div className="mt-2 font-display text-4xl text-foreground">{money(balance.available)}</div>
      <p className="text-xs text-muted-foreground">
        Available to pay out · {formatCoinCash(balance.available)} cash value
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface p-3">
          <Clock3 className="size-3.5 text-signal" />
          <div className="mt-1 font-display text-lg text-foreground">{money(balance.pending)}</div>
          <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
            Pending review
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface p-3">
          <TrendingUp className="size-3.5 text-signal" />
          <div className="mt-1 font-display text-lg text-foreground">{money(balance.lifetime)}</div>
          <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
            Lifetime earned
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={busy || balance.available <= 0}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-signal-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Request payout
      </button>

      {history.length > 0 ? (
        <div className="mt-4 space-y-2">
          <p className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
            Payout requests
          </p>
          {history.map((row) => (
            <div
              key={row.id}
              className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs"
            >
              <span className="text-foreground">{money(row.amount)}</span>
              <span className="text-muted-foreground capitalize">{row.status}</span>
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
