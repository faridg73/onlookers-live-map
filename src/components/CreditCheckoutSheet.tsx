import { useEffect, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Loader2, X } from "lucide-react";

import { formatPackPrice, type CreditPackage } from "@/lib/credit-packages";
import { startCreditPurchase } from "@/lib/credits.functions";
import { getStripe } from "@/lib/stripe";

/**
 * Full-coverage payment sheet. The embedded form offers Apple Pay, Google Pay,
 * Link and card entry, then returns to /profile with the session id.
 */
export function CreditCheckoutSheet({
  pack,
  onClose,
}: {
  pack: CreditPackage;
  onClose: () => void;
}) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setClientSecret(null);
    setError(null);

    void (async () => {
      try {
        const result = await startCreditPurchase({ data: { packageId: pack.id } });
        if (!live) return;
        if (result.error) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("The payment form could not be opened.");
        setClientSecret(result.clientSecret);
      } catch (cause) {
        if (!live) return;
        const message = cause instanceof Error ? cause.message : "Could not open checkout";
        setError(
          message.toLowerCase().includes("unauthorized")
            ? "Please sign in to buy Credits."
            : message,
        );
      }
    })();

    return () => {
      live = false;
    };
  }, [pack.id]);

  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/80 backdrop-blur-sm sm:items-center">
      <div
        className="flex max-h-[92dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-surface-raised sm:rounded-3xl"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              {pack.credits} Credits, {formatPackPrice(pack.priceCents)}
            </p>
            <p className="text-xs text-muted-foreground">Apple Pay, Google Pay, Link or card</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="rounded-full border border-border p-2 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {error ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-foreground">{error}</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-4 rounded-full bg-signal px-4 py-2 text-sm font-semibold text-signal-foreground"
              >
                Close
              </button>
            </div>
          ) : clientSecret ? (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Opening secure checkout…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
