import { useMemo, useState } from "react";
import { Apple, CoinsIcon, CreditCard, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  CREDIT_PACKAGES,
  CUSTOM_CREDIT_MAX,
  CUSTOM_CREDIT_MIN,
  customCreditPriceCents,
  formatPackPrice,
  type CreditPackage,
} from "@/lib/credit-packages";
import { CreditCheckoutSheet } from "@/components/CreditCheckoutSheet";

/** Buy Credits — preset tiers plus a custom amount at the fixed 4:$1 rate. */
export function BuyCreditsCard() {
  const [pack, setPack] = useState<CreditPackage | null>(null);
  const [customCredits, setCustomCredits] = useState<string>("");

  const customValue = useMemo(() => {
    const parsed = parseInt(customCredits.trim(), 10);
    if (Number.isNaN(parsed)) return null;
    return parsed;
  }, [customCredits]);

  const customPack: CreditPackage | null = useMemo(() => {
    if (customValue == null) return null;
    if (customValue < CUSTOM_CREDIT_MIN || customValue > CUSTOM_CREDIT_MAX) return null;
    return {
      id: "custom",
      priceId: "custom_credits_usd",
      name: "Custom Credits",
      baseCredits: customValue,
      bonusCredits: 0,
      credits: customValue,
      priceCents: customCreditPriceCents(customValue),
      blurb: `${customValue} custom credits at 4 per $1.`,
    };
  }, [customValue]);

  function buyCustom() {
    if (!customPack) {
      toast.error(`Enter a credit amount between ${CUSTOM_CREDIT_MIN.toLocaleString()} and ${CUSTOM_CREDIT_MAX.toLocaleString()}.`);
      return;
    }
    setPack(customPack);
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Buy Credits
        </span>
        <CoinsIcon className="size-4 text-live" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        4 Credits per $1. Choose a preset pack or enter any amount. Credits land in your wallet as
        soon as payment clears.
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
            <p className="font-display text-lg text-foreground">
              {tier.credits.toLocaleString()} credits
            </p>
            <p className="text-sm font-semibold text-live">{formatPackPrice(tier.priceCents)}</p>
            {tier.bonusCredits > 0 ? (
              <p className="mt-1 text-[0.7rem] leading-snug text-signal">
                +{tier.bonusCredits.toLocaleString()} bonus free
              </p>
            ) : (
              <p className="mt-1 text-[0.7rem] leading-snug text-muted-foreground">{tier.blurb}</p>
            )}
          </button>
        ))}

        <div className="col-span-2 rounded-xl border border-border bg-surface p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0 flex-1">
              <label htmlFor="custom-credits" className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Custom amount
              </label>
              <div className="mt-1 flex items-center gap-2">
                <input
                  id="custom-credits"
                  type="number"
                  min={CUSTOM_CREDIT_MIN}
                  max={CUSTOM_CREDIT_MAX}
                  step={1}
                  value={customCredits}
                  onChange={(e) => setCustomCredits(e.target.value)}
                  placeholder={`${CUSTOM_CREDIT_MIN.toLocaleString()}-${CUSTOM_CREDIT_MAX.toLocaleString()}`}
                  className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
                />
                <span className="shrink-0 text-sm text-muted-foreground">credits</span>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold text-live">
                {customPack ? formatPackPrice(customPack.priceCents) : "—"}
              </p>
              <button
                type="button"
                onClick={buyCustom}
                disabled={!customPack}
                className="mt-1 rounded-full bg-signal px-3 py-1 text-xs font-semibold text-signal-foreground disabled:opacity-40"
              >
                Buy
              </button>
            </div>
          </div>
          {customValue != null && !customPack && (
            <p className="mt-2 text-xs text-live">
              Enter an amount between {CUSTOM_CREDIT_MIN.toLocaleString()} and {CUSTOM_CREDIT_MAX.toLocaleString()} credits.
            </p>
          )}
        </div>
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
