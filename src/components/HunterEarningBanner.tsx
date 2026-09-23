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

      <div className="relative mt-4 grid grid-cols-3 gap-2">
        {STEPS.map((step) => (
          <div
            key={step.label}
            className="rounded-xl border border-border bg-background/60 p-2.5"
          >
            <step.icon className="size-4 text-signal" aria-hidden />
            <p className="mt-2 text-xs font-bold text-foreground">{step.label}</p>
            <p className="mt-0.5 text-[0.62rem] leading-snug text-muted-foreground">
              {step.text}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
