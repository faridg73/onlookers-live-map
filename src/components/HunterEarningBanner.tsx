// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Banknote, Camera, CheckCircle, Zap } from "lucide-react";

const STEPS = [
  {
    icon: CheckCircle,
    label: "Claim",
    text: "Pick an open bounty near you.",
  },
  {
    icon: Camera,
    label: "Capture",
    text: "Film the request and upload it.",
  },
  {
    icon: Banknote,
    label: "Cash out",
    text: "Get paid to your bank in minutes.",
  },
];

export function HunterEarningBanner() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-signal/30 bg-surface p-4">
      <div className="absolute -right-6 -top-6 size-24 rounded-full bg-signal/10 blur-2xl" />

      <div className="relative flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
            <Zap className="size-4 fill-signal text-signal" aria-hidden /> How hunting works
          </p>
          <p className="mt-1 max-w-[16rem] text-xs leading-relaxed text-foreground/90">
            Turn your phone into a paycheck. Onlookers keep{" "}
            <span className="font-bold text-signal">100% of the bounty</span> and receive{" "}
            <span className="font-bold text-signal">fast Stripe payouts</span> straight to
            their bank.
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-signal/15 px-2 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.08em] text-signal">
          Fast payout
        </span>
      </div>

      <ol className="relative mt-4 space-y-3 sm:grid sm:grid-cols-3 sm:gap-2 sm:space-y-0">
        {STEPS.map((step) => (
          <li
            key={step.label}
            className="flex items-start gap-3 sm:block sm:rounded-xl sm:border sm:border-border sm:bg-background/60 sm:p-2.5"
          >
            <step.icon className="mt-0.5 size-4 shrink-0 text-signal" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground sm:mt-2 sm:text-xs">{step.label}</p>
              <p className="mt-0.5 text-xs leading-snug text-muted-foreground sm:text-[0.62rem]">
                {step.text}
              </p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
