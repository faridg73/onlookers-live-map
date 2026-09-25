// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";
import { Check, Loader2, Lock, ShieldCheck, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { getStripe } from "@/lib/stripe";
import { startProCheckout } from "@/lib/pro.functions";
import { PRO_PLANS, TRIAL_VISITS, formatUsd, type ProPlan, type ProPlanId } from "@/lib/pro-plans";

interface ProPaywallDialogProps {
  /** Plan currently active on the account, so it can be marked. */
  currentPlan?: string;
  /** Visits already used in the free trial, for the headline copy. */
  trialVisitsUsed?: number;
  /** Shown when the trial allowance is spent rather than a plain upgrade. */
  reason?: "trial-exhausted" | "allowance-used" | "upgrade";
  /** Plan highlighted when the sheet opens. */
  initialPlan?: ProPlanId;
  onClose: () => void;
}

const HEADLINES: Record<NonNullable<ProPaywallDialogProps["reason"]>, { title: string; body: string }> = {
  "trial-exhausted": {
    title: "You've used both free verified visits",
    body: "Pick a plan to keep scheduling verified property visits. Cancel anytime.",
  },
  "allowance-used": {
    title: "Monthly visit allowance used",
    body: "Move up a plan to schedule more verified visits this billing month.",
  },
  upgrade: {
    title: "Choose your Verified Visits plan",
    body: "Monthly plans, cancel anytime. Onlooker payouts stay in escrow separately.",
  },
};

export function ProPaywallDialog({
  currentPlan = "none",
  trialVisitsUsed = TRIAL_VISITS,
  reason = "upgrade",
  initialPlan = "pro",
  onClose,
}: ProPaywallDialogProps) {
  const [selected, setSelected] = useState<ProPlanId>(initialPlan);
  const [checkoutPlan, setCheckoutPlan] = useState<ProPlan | null>(null);
  const copy = HEADLINES[reason];
  const plan = PRO_PLANS.find((p) => p.id === selected) ?? PRO_PLANS[1]!;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (checkoutPlan) {
    return <ProCheckoutSheet plan={checkoutPlan} onClose={onClose} onBack={() => setCheckoutPlan(null)} />;
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="pro-paywall-title"
      className="fixed inset-0 z-[70] flex items-end justify-center bg-background/85 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        className="flex w-full max-w-[min(64rem,100%)] flex-col overflow-hidden rounded-t-3xl border border-border bg-surface-raised sm:rounded-3xl"
        style={{
          maxHeight: "calc(100dvh - env(safe-area-inset-top) - 0.5rem)",
          paddingTop: "env(safe-area-inset-top)",
        }}
      >
        {/* Header: grid keeps the title shrinkable and the 48px close target fixed. */}
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 border-b border-border px-4 py-3 sm:px-6 sm:py-4">
          <div className="min-w-0">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">Verified Visits Pro</p>
            <h2 id="pro-paywall-title" className="mt-1 text-base font-bold leading-snug text-foreground sm:text-xl">
              {copy.title}
            </h2>
            <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{copy.body}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close plans"
            className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground transition hover:bg-secondary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-4 sm:px-6 sm:py-5">
          {reason === "trial-exhausted" && (
            <p className="mb-4 rounded-2xl border border-signal/40 bg-signal/10 px-4 py-3 text-xs font-semibold text-foreground sm:text-sm">
              Trial: {Math.min(trialVisitsUsed, TRIAL_VISITS)} of {TRIAL_VISITS} free verified visits used.
            </p>
          )}

          <div role="radiogroup" aria-label="Verified Visits plans" className="grid gap-3 sm:grid-cols-3 sm:gap-4">
            {PRO_PLANS.map((item) => {
              const active = selected === item.id;
              const current = currentPlan === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setSelected(item.id)}
                  className={`flex min-h-12 w-full flex-col rounded-2xl border p-4 text-left transition sm:p-5 ${
                    active ? "border-signal bg-signal/10" : "border-border bg-card hover:border-signal/50"
                  }`}
                >
                  <span className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
                    <span className="truncate text-sm font-bold text-foreground sm:text-base">{item.name}</span>
                    {item.featured && (
                      <span className="shrink-0 rounded-full bg-signal px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-wider text-signal-foreground">
                        Popular
                      </span>
                    )}
                    {current && !item.featured && (
                      <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[0.6rem] font-bold uppercase text-muted-foreground">
                        Current
                      </span>
                    )}
                  </span>
                  <span className="mt-2 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold leading-none text-foreground sm:text-3xl">
                      {formatUsd(item.priceCents)}
                    </span>
                    <span className="text-xs font-medium text-muted-foreground">/mo</span>
                  </span>
                  <span className="mt-1 text-xs font-semibold text-signal sm:text-sm">{item.visits}</span>
                  <span className="mt-1 text-xs text-muted-foreground">{item.tagline}</span>
                  <ul className="mt-3 flex-1 space-y-1.5">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex gap-2 text-xs text-foreground sm:text-sm">
                        <Check className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
                        <span className="min-w-0">{feature}</span>
                      </li>
                    ))}
                  </ul>
                </button>
              );
            })}
          </div>
        </div>

        {/* Footer CTA: 48px+ target, clear of the home indicator. */}
        <div
          className="border-t border-border bg-surface-raised px-4 pt-3 sm:px-6 sm:pt-4"
          style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 0.85rem)" }}
        >
          <Button
            type="button"
            disabled={currentPlan === plan.id}
            onClick={() => setCheckoutPlan(plan)}
            className="h-12 w-full rounded-xl bg-signal text-sm font-bold uppercase tracking-wide text-signal-foreground hover:brightness-110 sm:h-14 sm:text-base"
          >
            <Lock className="size-4" aria-hidden />
            {currentPlan === plan.id
              ? `${plan.name} is your current plan`
              : `Upgrade now — ${formatUsd(plan.priceCents)}/mo`}
          </Button>
          <p className="mt-2 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[0.7rem] text-muted-foreground">
            <ShieldCheck className="size-3.5 shrink-0 text-signal" aria-hidden />
            Secure Stripe checkout · Apple Pay &amp; Google Pay · Cancel anytime
          </p>
        </div>
      </div>
    </div>
  );
}

function ProCheckoutSheet({ plan, onClose, onBack }: { plan: ProPlan; onClose: () => void; onBack: () => void }) {
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const result = await startProCheckout({ data: { planId: plan.id } });
        if (result.error) throw new Error(result.error);
        if (!result.clientSecret) throw new Error("The payment form could not be opened.");
        setClientSecret(result.clientSecret);
      } catch (cause) {
        const msg = cause instanceof Error ? cause.message : "Could not open checkout";
        setError(msg.toLowerCase().includes("unauthorized") ? "Please sign in to choose a plan." : msg);
      }
    })();
  }, [plan.id]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Checkout for Verified Visits ${plan.name}`}
      className="fixed inset-0 z-[70] flex items-end justify-center bg-background/85 backdrop-blur-sm sm:items-center sm:p-6"
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl border border-border bg-surface-raised sm:rounded-3xl"
        style={{
          maxHeight: "calc(100dvh - env(safe-area-inset-top) - 0.5rem)",
          paddingTop: "env(safe-area-inset-top)",
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Verified Visits {plan.name}, {formatUsd(plan.priceCents)}/mo
            </p>
            <button type="button" onClick={onBack} className="text-xs font-semibold text-signal underline">
              Change plan
            </button>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close checkout"
            className="grid size-12 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground hover:bg-secondary"
          >
            <X className="size-5" aria-hidden />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto overscroll-contain px-2 py-3">
          {error ? (
            <div className="px-3 py-8 text-center">
              <p className="text-sm text-foreground">{error}</p>
              <Button type="button" onClick={onClose} className="mt-4 h-12 rounded-full bg-signal px-6 text-signal-foreground">
                Close
              </Button>
            </div>
          ) : clientSecret ? (
            <EmbeddedCheckoutProvider stripe={getStripe()} options={{ clientSecret }}>
              <EmbeddedCheckout />
            </EmbeddedCheckoutProvider>
          ) : (
            <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" aria-hidden /> Opening secure checkout…
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
