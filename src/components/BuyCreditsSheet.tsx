// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createPortal } from "react-dom";
import { X } from "lucide-react";

import { BuyCreditsCard } from "@/components/BuyCreditsCard";
import { formatCreditCash, formatCredits } from "@/lib/credits";

/**
 * Refill panel that opens right on top of whatever the person was doing, so a
 * short wallet never ends the journey — they buy credits and carry on.
 */
export function BuyCreditsSheet({
  open,
  balance,
  needed = null,
  onClose,
}: {
  open: boolean;
  balance: number | null;
  /** Credits the current step needs, shown as the shortfall to cover. */
  needed?: number | null;
  onClose: () => void;
}) {
  if (!open) return null;

  const short = needed != null && balance != null ? Math.max(0, Math.ceil(needed - balance)) : null;

  const panel = (
    <div className="fixed inset-0 z-[90] bg-background/90 backdrop-blur-sm">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="buy-credits-title"
        className="absolute inset-x-0 bottom-0 top-6 flex flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl sm:inset-x-[max(1rem,calc(50%-24rem))] sm:bottom-6 sm:rounded-2xl"
      >
        <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 pb-3 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
          <div>
            <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.18em] text-signal">
              Step 1 · Buy credits
            </p>
            <h2 id="buy-credits-title" className="font-display text-xl font-extrabold text-foreground">
              Top up your wallet
            </h2>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              {balance != null ? `${formatCredits(balance)} in your wallet · ${formatCreditCash(balance)}` : "Sign in to see your balance"}
              {short != null && short > 0 ? ` · ${formatCredits(short)} short for this bounty` : ""}
            </p>
          </div>
          <button
            type="button"
            aria-label="Close buy credits"
            onClick={onClose}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] sm:px-6">
          <BuyCreditsCard />
          <p className="mt-4 text-center text-xs font-medium text-muted-foreground">
            Credits land in your wallet the moment the payment clears. Close this panel to pick up
            exactly where you left off.
          </p>
        </div>
      </section>
    </div>
  );

  return typeof document === "undefined" ? panel : createPortal(panel, document.body);
}
