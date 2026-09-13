import { useState } from "react";
import { Apple, CoinsIcon, CreditCard, Sparkles } from "lucide-react";

import { CREDIT_PACKAGES, formatPackPrice, type CreditPackage } from "@/lib/credit-packages";
import { CreditCheckoutSheet } from "@/components/CreditCheckoutSheet";

/** Buy Credits — fixed 4:1 tiers that open the express payment sheet. */
export function BuyCreditsCard() {
  const [pack, setPack] = useState<CreditPackage | null>(null);

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Buy Credits
        </span>
        <CoinsIcon className="size-4 text-live" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        4 Credits per $1. Credits fund your live view requests and tips, and land in your wallet as
        soon as the payment clears.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2">
        {CREDIT_PACKAGES.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => setPack(tier)}
            className={`rounded-xl border px-3 py-3 text-left transition ${
              tier.badge
                ? "border-signal bg-signal/10"
                : "border-border bg-surface hover:border-signal/50"
            }`}
          >
            {tier.badge && (
              <span className="mb-1 inline-flex items-center gap-1 rounded-full bg-signal px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] text-signal-foreground">
                <Sparkles className="size-2.5" /> {tier.badge}
              </span>
            )}
            <p className="font-display text-lg text-foreground">{tier.credits} credits</p>
            <p className="text-sm font-semibold text-live">{formatPackPrice(tier.priceCents)}</p>
            <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">{tier.blurb}</p>
          </button>
        ))}
      </div>

      <p className="mt-3 flex items-center gap-2 text-[0.7rem] text-muted-foreground">
        <Apple className="size-3.5" />
        <CreditCard className="size-3.5" />
        Apple Pay, Google Pay, Link and cards accepted.
      </p>

      {pack && <CreditCheckoutSheet pack={pack} onClose={() => setPack(null)} />}
    </div>
  );
}
