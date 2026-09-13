import { useState } from "react";
import { CoinsIcon, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { CREDIT_PACKAGES, formatPackPrice } from "@/lib/credit-packages";
import { startCreditPurchase } from "@/lib/credits.functions";

/** Buy Looker Credits — three fixed packs that open card checkout. */
export function BuyCreditsCard() {
  const [busy, setBusy] = useState<string | null>(null);

  async function buy(packageId: string) {
    setBusy(packageId);
    try {
      const result = await startCreditPurchase({ data: { packageId } });
      if (result.error) throw new Error(result.error);
      if (result.url) window.location.href = result.url;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open checkout");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Buy Looker Credits
        </span>
        <Credits className="size-4 text-live" />
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        Credits fund your live view requests and tips. They land in your wallet as soon as the payment
        clears.
      </p>

      <div className="mt-4 space-y-2">
        {CREDIT_PACKAGES.map((pack) => (
          <button
            key={pack.id}
            type="button"
            disabled={busy !== null}
            onClick={() => void buy(pack.id)}
            className={`flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${
              pack.badge
                ? "border-live bg-live/10"
                : "border-border bg-surface hover:border-live/50"
            } disabled:opacity-60`}
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="truncate text-sm font-semibold text-foreground">{pack.name}</span>
                {pack.badge && (
                  <span className="flex items-center gap-1 rounded-full bg-live px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-black">
                    <Sparkles className="size-3" /> {pack.badge}
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">{pack.blurb}</p>
              <p className="mt-1 font-display text-base text-live">{pack.credits} credits</p>
            </div>
            <span className="shrink-0 font-display text-lg text-foreground">
              {busy === pack.id ? (
                <Loader2 className="size-5 animate-spin" />
              ) : (
                formatPackPrice(pack.priceCents)
              )}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
