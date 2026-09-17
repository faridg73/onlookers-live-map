import { useState } from "react";
import { Check, Sparkles } from "lucide-react";

import {
  ANNUAL_DISCOUNT_TAG,
  PLUS_PLANS,
  formatMoney,
  planCredits,
  planPriceCents,
  type BillingCycle,
  type PlusPlan,
} from "@/lib/subscriptions";
import { SubscriptionCheckoutSheet } from "@/components/SubscriptionCheckoutSheet";
import type { SubscriptionTier } from "@/lib/wallet-ledger";

/** The Onlooker+ mark, reused in headers and plan cards. */
export function PlusMark({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-display tracking-tight ${className}`}>
      Onlooker
      <span className="ml-0.5 text-signal">+</span>
    </span>
  );
}

/** Three-tier Onlooker+ pricing with a monthly / yearly billing toggle. */
export function OnlookerPlusPlans({ currentTier = "free" }: { currentTier?: SubscriptionTier }) {
  const [cycle, setCycle] = useState<BillingCycle>("monthly");
  const [checkout, setCheckout] = useState<PlusPlan | null>(null);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-lg text-foreground">
            <PlusMark /> membership
          </h3>
          <p className="text-xs text-muted-foreground">
            Monthly credits, priority alerts and pro tools.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div
            role="group"
            aria-label="Billing cycle"
            className="flex rounded-full border border-border bg-surface p-1"
          >
            {(["monthly", "yearly"] as BillingCycle[]).map((option) => (
              <button
                key={option}
                type="button"
                aria-pressed={cycle === option}
                onClick={() => setCycle(option)}
                className={`rounded-full px-3 py-1 text-xs font-semibold capitalize transition ${
                  cycle === option
                    ? "bg-signal text-signal-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
          <span className="rounded-full bg-signal/15 px-2 py-1 text-[0.6rem] font-bold uppercase tracking-[0.1em] text-signal">
            {ANNUAL_DISCOUNT_TAG}
          </span>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        {PLUS_PLANS.map((plan) => {
          const active = currentTier === plan.id;
          return (
            <div
              key={plan.id}
              className={`flex flex-col rounded-2xl border bg-surface p-4 ${
                plan.highlight ? `${plan.accent.border} shadow-[0_0_0_1px] shadow-signal/20` : "border-border"
              }`}
            >
              <div className={`-m-4 mb-4 rounded-t-2xl border-b px-4 py-3 ${plan.accent.bg} ${plan.accent.border}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className={`font-display text-base ${plan.accent.text}`}>
                    <PlusMark /> {plan.name}
                  </p>
                  {plan.highlight && (
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[0.55rem] font-bold uppercase tracking-[0.1em] ${plan.accent.chip}`}>
                      <Sparkles className="size-2.5" /> Popular
                    </span>
                  )}
                </div>
                <p className="mt-1 text-[0.7rem] text-muted-foreground">{plan.tagline}</p>
              </div>

              <div className="flex items-baseline gap-1">
                <span className="font-display text-3xl text-foreground">
                  {formatMoney(planPriceCents(plan, cycle))}
                </span>
                <span className="text-xs text-muted-foreground">
                  {cycle === "monthly" ? "/mo" : "/yr"}
                </span>
              </div>
              <p className={`mt-1 text-xs font-semibold ${plan.accent.text}`}>
                {cycle === "monthly"
                  ? `${plan.creditsLabel} included monthly`
                  : `${planCredits(plan, cycle).toLocaleString()} credits included yearly`}
              </p>

              <ul className="mt-3 flex-1 space-y-1.5">
                {plan.perks.map((perk) => (
                  <li key={perk} className="flex gap-2 text-xs text-muted-foreground">
                    <Check className={`mt-0.5 size-3.5 shrink-0 ${plan.accent.text}`} />
                    <span>{perk}</span>
                  </li>
                ))}
              </ul>

              <button
                type="button"
                disabled={active}
                onClick={() => setCheckout(plan)}
                className={`mt-4 rounded-full px-4 py-2 text-sm font-semibold transition disabled:opacity-50 ${plan.accent.chip}`}
              >
                {active ? "Current plan" : `Get ${plan.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {checkout && (
        <SubscriptionCheckoutSheet
          plan={checkout}
          cycle={cycle}
          onClose={() => setCheckout(null)}
        />
      )}
    </div>
  );
}
