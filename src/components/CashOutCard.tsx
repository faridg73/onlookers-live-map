import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Banknote, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { cashOut, getPayoutStatus, startPayoutOnboarding } from "@/lib/payouts.functions";

const MIN_CASH_OUT = 10;

export function CashOutCard() {
  const loadStatus = useServerFn(getPayoutStatus);
  const beginOnboarding = useServerFn(startPayoutOnboarding);
  const sendCashOut = useServerFn(cashOut);

  const [balance, setBalance] = useState<number | null>(null);
  const [status, setStatus] = useState<{
    connected: boolean;
    payoutsEnabled: boolean;
    supported?: boolean | undefined;
  } | null>(null);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) {
      setBalance(null);
      setStatus(null);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", auth.user.id)
      .maybeSingle();
    setBalance(Number(profile?.wallet_balance ?? 0));
    try {
      const next = await loadStatus();
      setStatus({
        connected: next.connected,
        payoutsEnabled: next.payoutsEnabled,
        supported: next.supported,
      });
    } catch {
      setStatus({ connected: false, payoutsEnabled: false });
    }
  }, [loadStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connectBank() {
    setBusy(true);
    try {
      const result = await beginOnboarding();
      if (result.error || !result.url) throw new Error(result.error ?? "Could not open bank setup");
      // Stripe blocks its setup page inside frames, so always leave the preview frame.
      const opened = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        if (window.top && window.top !== window.self) window.top.location.href = result.url;
        else window.location.href = result.url;
      }
      toast.info("Bank setup opened in a new tab. Come back here when you're done.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open bank setup");
    } finally {
      setBusy(false);
    }
  }

  async function withdraw() {
    const value = Number(amount);
    if (!Number.isFinite(value) || value < MIN_CASH_OUT) {
      toast.error(`Minimum cash out is $${MIN_CASH_OUT}`);
      return;
    }
    if (balance !== null && value > balance) {
      toast.error("That's more than your balance");
      return;
    }
    setBusy(true);
    try {
      const result = await sendCashOut({ data: { amount: Math.round(value * 100) / 100 } });
      if (result.error) throw new Error(result.error);
      toast.success(`$${value.toFixed(2)} is on its way to your bank`);
      setAmount("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cash out failed");
    } finally {
      setBusy(false);
    }
  }

  if (balance === null) return null;
  // Bank cash-outs need Stripe Connect on the platform account; when it's not
  // available the Earnings Wallet "Request payout" flow handles withdrawals.
  if (status?.supported === false) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Available balance
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Banknote className="size-3.5 text-signal" />
          {status?.payoutsEnabled ? "Bank connected" : "No bank yet"}
        </span>
      </div>
      <div className="mt-2 font-display text-4xl text-foreground">${balance.toFixed(2)}</div>

      {status?.payoutsEnabled ? (
        <div className="mt-4 flex gap-2">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            placeholder={`Amount (min $${MIN_CASH_OUT})`}
            className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
          />
          <button
            type="button"
            onClick={withdraw}
            disabled={busy}
            className="flex items-center gap-2 rounded-xl bg-signal px-4 py-2 text-sm font-semibold text-signal-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Cash out
          </button>
        </div>
      ) : (
        <div className="mt-4">
          <button
            type="button"
            onClick={connectBank}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-signal-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            {status?.connected ? "Finish bank setup" : "Connect a bank account"}
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Verify your identity and bank details once, then cash out any time (minimum $
            {MIN_CASH_OUT}).
          </p>
        </div>
      )}
    </div>
  );
}
