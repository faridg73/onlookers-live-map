import { useMemo, useState } from "react";
import { CoinsIcon, Sparkles } from "lucide-react";
import { toast } from "sonner";

import {
  CUSTOM_CREDIT_MAX,
  CUSTOM_CREDIT_MIN,
  TOPUP_PACKAGES,
  customCreditPriceCents,
  formatPackPrice,
  type CreditPackage,
} from "@/lib/credit-packages";
import { CreditCheckoutSheet } from "@/components/CreditCheckoutSheet";

/** Preset top-up packs plus a custom amount with live dollar value (4 credits = $1). */
export function WalletTopUpSection() {
  const [pack, setPack] = useState<CreditPackage | null>(null);
  const [custom, setCustom] = useState("");

  const customCredits = useMemo(() => {
    const parsed = parseInt(custom.trim(), 10);
    return Number.isNaN(parsed) ? null : parsed;
  }, [custom]);

  const customPack: CreditPackage | null = useMemo(() => {
    if (customCredits == null) return null;
    if (customCredits < CUSTOM_CREDIT_MIN || customCredits > CUSTOM_CREDIT_MAX) return null;
    return {
      id: "custom",
      priceId: "custom_credits_usd",
      name: "Custom Credits",
      baseCredits: customCredits,
      bonusCredits: 0,
      credits: customCredits,
      priceCents: customCreditPriceCents(customCredits),
      blurb: `${customCredits} custom credits at 4 per $1.`,
    };
  }, [customCredits]);

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg text-foreground">Top up your wallet</h3>
          <p className="text-xs text-muted-foreground">
            4 credits = $1.00 USD. Credits land as soon as payment clears.
          </p>
        </div>
        <CoinsIcon className="size-4 text-signal" />
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {TOPUP_PACKAGES.map((tier) => (
          <button
            key={tier.id}
            type="button"
            onClick={() => setPack(tier)}
            className={`rounded-2xl border px-4 py-4 text-left transition ${
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
            <p className="font-display text-2xl text-foreground">
              {tier.credits.toLocaleString()}
            </p>
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              credits
            </p>
            <p className="mt-1 text-sm font-semibold text-signal">
              {formatPackPrice(tier.priceCents)}
            </p>
            {tier.bonusCredits > 0 && (
              <p className="mt-1 text-[0.7rem] text-muted-foreground">
                includes {tier.bonusCredits} bonus
              </p>
            )}
          </button>
        ))}
      </div>

      <div className="mt-3 rounded-2xl border border-border bg-surface p-4">
        <label
          htmlFor="topup-custom-credits"
          className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground"
        >
          Custom amount
        </label>
        <div className="mt-2 flex flex-wrap items-end gap-3">
          <div className="flex min-w-[9rem] flex-1 items-center gap-2">
            <input
              id="topup-custom-credits"
              type="number"
              inputMode="numeric"
              min={CUSTOM_CREDIT_MIN}
              max={CUSTOM_CREDIT_MAX}
              step={1}
              value={custom}
              onChange={(event) => setCustom(event.target.value)}
              placeholder={`${CUSTOM_CREDIT_MIN}-${CUSTOM_CREDIT_MAX.toLocaleString()}`}
              className="w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-signal"
            />
            <span className="shrink-0 text-sm text-muted-foreground">credits</span>
          </div>
          <div className="text-right">
            <p className="text-[0.65rem] uppercase tracking-[0.16em] text-muted-foreground">
              Cost
            </p>
            <p className="font-display text-2xl text-signal" aria-live="polite">
              {customPack ? formatPackPrice(customPack.priceCents) : "$0.00"}
            </p>
          </div>
          <button
            type="button"
            disabled={!customPack}
            onClick={() => {
              if (!customPack) {
                toast.error(
                  `Enter between ${CUSTOM_CREDIT_MIN} and ${CUSTOM_CREDIT_MAX.toLocaleString()} credits.`,
                );
                return;
              }
              setPack(customPack);
            }}
            className="rounded-full bg-signal px-4 py-2 text-sm font-semibold text-signal-foreground disabled:opacity-40"
          >
            Top up
          </button>
        </div>
        {customCredits != null && !customPack && (
          <p className="mt-2 text-xs text-live">
            Enter between {CUSTOM_CREDIT_MIN} and {CUSTOM_CREDIT_MAX.toLocaleString()} credits.
          </p>
        )}
      </div>

      {pack && <CreditCheckoutSheet pack={pack} onClose={() => setPack(null)} />}
    </div>
  );
}
