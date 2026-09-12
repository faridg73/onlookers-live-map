import { useState } from "react";
import { CreditCard, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useServerFn } from "@tanstack/react-start";

import { startWalletTopUp } from "@/lib/topup.functions";

const PRESETS = [10, 25, 50, 100];

/** Card payment that adds money to the wallet used to fund bounties. */
export function AddFundsCard() {
  const topUp = useServerFn(startWalletTopUp);
  const [amount, setAmount] = useState(25);
  const [busy, setBusy] = useState(false);

  async function pay() {
    if (!(amount >= 5)) {
      toast.error("Add at least $5.");
      return;
    }
    setBusy(true);
    try {
      const result = await topUp({ data: { amount } });
      if (result.error) throw new Error(result.error);
      if (!result.url) throw new Error("No payment page was returned.");
      const opened = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = result.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the payment page.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Add money
        </span>
        <CreditCard className="size-4 text-signal" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Top up by card so you can post bounties. Money lands in your wallet as soon as the payment
        clears.
      </p>

      <div className="mt-3 grid grid-cols-4 gap-2">
        {PRESETS.map((value) => (
          <button
            key={value}
            type="button"
            aria-pressed={amount === value}
            onClick={() => setAmount(value)}
            className={
              amount === value
                ? "rounded-xl bg-signal py-2 text-sm font-semibold text-signal-foreground"
                : "rounded-xl border border-border bg-surface py-2 text-sm text-foreground"
            }
          >
            ${value}
          </button>
        ))}
      </div>

      <label className="mt-3 block text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
        Custom amount
        <input
          type="number"
          min={5}
          max={500}
          value={amount}
          onChange={(e) => setAmount(Number(e.target.value))}
          className="mt-1 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-signal"
        />
      </label>

      <button
        type="button"
        onClick={() => void pay()}
        disabled={busy}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-signal-foreground disabled:opacity-60"
      >
        {busy ? <Loader2 className="size-4 animate-spin" /> : null}
        Add ${amount || 0} by card
      </button>
    </div>
  );
}
