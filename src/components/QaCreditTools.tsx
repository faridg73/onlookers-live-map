// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FlaskConical, Loader2 } from "lucide-react";
import { toast } from "sonner";

import {
  grantTestCredits,
  qaToolsEnabled,
  releaseCreditHolds,
  resetCashoutThrottle,
} from "@/lib/qa-credits.functions";

/**
 * Preview-only testing panel: grant test credits (available or held) and end
 * the 3-day hold instantly. Hidden on the live production hosts.
 */
export function QaCreditTools({ onChanged }: { onChanged: () => void | Promise<void> }) {
  const checkEnabled = useServerFn(qaToolsEnabled);
  const grant = useServerFn(grantTestCredits);
  const release = useServerFn(releaseCreditHolds);
  const resetThrottle = useServerFn(resetCashoutThrottle);
  const [enabled, setEnabled] = useState(false);
  const [credits, setCredits] = useState("100");
  const [onHold, setOnHold] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void (async () => {
      try {
        setEnabled((await checkEnabled()).enabled);
      } catch {
        setEnabled(false);
      }
    })();
  }, [checkEnabled]);

  if (!enabled) return null;

  async function addCredits() {
    const value = Math.round(Number(credits));
    if (!Number.isFinite(value) || value < 1) {
      toast.error("Enter how many credits to add.");
      return;
    }
    setBusy(true);
    try {
      await grant({ data: { credits: value, onHold } });
      toast.success(
        onHold ? `${value} test credits added on hold.` : `${value} test credits added and available.`,
      );
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add test credits");
    } finally {
      setBusy(false);
    }
  }

  async function endHold() {
    setBusy(true);
    try {
      const result = await release();
      toast.success(
        result.released > 0 ? "Hold ended, those credits are available now." : "Nothing is on hold.",
      );
      await onChanged();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not end the hold");
    } finally {
      setBusy(false);
    }
  }

  async function clearThrottle() {
    setBusy(true);
    try {
      await resetThrottle();
      toast.success("Cash-out attempt counter cleared, try again now.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not clear the counter");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-dashed border-signal/50 bg-signal/5 p-4">
      <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <FlaskConical className="size-4 text-signal" /> Testing tools (preview only)
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Fake credits for checking the cash-out flow. This panel never appears on the live site.
      </p>

      <div className="mt-3 flex gap-2">
        <input
          type="number"
          min={1}
          value={credits}
          onChange={(event) => setCredits(event.target.value)}
          aria-label="Test credits to add"
          className="w-28 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
        />
        <button
          type="button"
          onClick={() => void addCredits()}
          disabled={busy}
          className="flex-1 rounded-xl bg-signal px-3 py-2 text-sm font-bold text-background disabled:opacity-60"
        >
          {busy ? <Loader2 className="mx-auto size-4 animate-spin" /> : "Add test credits"}
        </button>
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={onHold}
          onChange={(event) => setOnHold(event.target.checked)}
          className="size-4 accent-signal"
        />
        Put these on the 3-day hold instead of available
      </label>

      <button
        type="button"
        onClick={() => void endHold()}
        disabled={busy}
        className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
      >
        End the 3-day hold now
      </button>

      <button
        type="button"
        onClick={() => void clearThrottle()}
        disabled={busy}
        className="mt-2 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
      >
        Reset cash-out attempt limit
      </button>
    </div>
  );
}
