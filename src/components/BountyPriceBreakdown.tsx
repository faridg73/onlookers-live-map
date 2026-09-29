// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Receipt } from "lucide-react";
import type { BountyQuote } from "@/lib/bounty-pricing";

/** How much this single step adds, so no line looks like another full charge. */
function deltaLabel(delta: number, isBase: boolean) {
  if (isBase) return `${delta} Credits`;
  if (delta === 0) return "No extra";
  return `${delta > 0 ? "+" : "−"}${Math.abs(delta)} ${Math.abs(delta) === 1 ? "Credit" : "Credits"}`;
}

/** Itemised credit breakdown so nobody locks funds without seeing the maths. */
export function BountyPriceBreakdown({ quote }: { quote: BountyQuote }) {
  return (
    <div className="rounded-2xl border-2 border-border bg-surface-raised p-3">
      <p className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-foreground">
        <Receipt className="size-3.5 text-signal" />
        Cost breakdown
      </p>
      <ul className="mt-2 space-y-1.5">
        {quote.lines.map((line, index) => (
          <li key={line.label} className="flex items-baseline justify-between gap-3 text-xs">
            <span className="text-muted-foreground">
              <span className="font-semibold text-foreground">{line.label}</span> · {line.detail}
            </span>
            <span
              className={`shrink-0 font-extrabold tabular-nums ${
                index > 0 && line.delta === 0 ? "text-muted-foreground" : "text-foreground"
              }`}
            >
              {deltaLabel(line.delta, index === 0)}
            </span>
          </li>
        ))}
      </ul>
      <div className="mt-2.5 flex items-baseline justify-between border-t border-border pt-2.5">
        <span className="text-sm font-extrabold text-foreground">Locked in escrow</span>
        <span className="font-display text-lg font-extrabold tabular-nums text-signal">
          {quote.total} Credits
        </span>
      </div>
    </div>
  );
}
