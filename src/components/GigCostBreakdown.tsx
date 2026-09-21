// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Receipt } from "lucide-react";
import {
  GIG_MIN_PAYOUT_USD,
  GIG_RATE_USD_PER_HOUR,
  GIG_RATE_USD_PER_MINUTE,
  type GigQuote,
} from "@/lib/capture-format";
import { formatCredits, formatCreditCash } from "@/lib/credits";

/** Lime accent the poster asked for on the gig pricing card. */
const LIME = "#22c55e";

function Row({ label, detail, credits, lime = false }: { label: string; detail: string; credits: number; lime?: boolean }) {
  return (
    <li className="flex items-baseline justify-between gap-3 text-xs">
      <span className="text-muted-foreground">
        <span className="font-semibold" style={lime ? { color: LIME } : undefined}>
          {!lime && <span className="text-foreground">{label}</span>}
          {lime ? label : null}
        </span>{" "}
        · {detail}
      </span>
      <span className="shrink-0 font-bold tabular-nums" style={lime ? { color: LIME } : undefined}>
        {formatCredits(credits)} · {formatCreditCash(credits)}
      </span>
    </li>
  );
}

/**
 * Transparent gig-economy cost card: Base Fee + Time Rate = Total Payout,
 * shown in USD and credits, updating instantly with the duration pills.
 */
export function GigCostBreakdown({
  gig,
  live = false,
  rewardCredits,
  rewardMatchesGig,
  urgencyFactor = 1,
  weatherFactor = 1,
  tipCredits = 0,
  totalCredits,
}: {
  gig: GigQuote;
  live?: boolean;
  /** The reward the escrow quote actually uses as its base. */
  rewardCredits: number;
  /** True when the reward is exactly the gig price for this duration. */
  rewardMatchesGig: boolean;
  urgencyFactor?: number;
  weatherFactor?: number;
  tipCredits?: number;
  totalCredits: number;
}) {
  const pct = (m: number) => `+${Math.round((m - 1) * 100)}%`;
  const afterUrgency = Math.round(rewardCredits * urgencyFactor);
  const afterWeather = Math.round(afterUrgency * weatherFactor);

  return (
    <div
      className="rounded-2xl border-2 bg-surface-raised p-3"
      style={{ borderColor: LIME, boxShadow: "0 0 14px rgba(34,197,94,0.25)" }}
    >
      <p
        className="flex items-center gap-2 text-[0.7rem] font-extrabold uppercase tracking-[0.16em]"
        style={{ color: LIME }}
      >
        <Receipt className="size-3.5" />
        Bounty cost breakdown
      </p>
      <ul className="mt-2 space-y-1.5">
        {rewardMatchesGig ? (
          <>
            <Row label="Base dispatch fee" detail="paid on every task" credits={gig.baseFeeCredits} />
            <Row
              label="Time rate"
              detail={
                live
                  ? `live session block (${gig.minutes} min) at $${GIG_RATE_USD_PER_HOUR}/hr`
                  : `${gig.minutes} min at $${GIG_RATE_USD_PER_HOUR}/hr ($${GIG_RATE_USD_PER_MINUTE.toFixed(2)}/min)`
              }
              credits={gig.timeCredits}
            />
            {gig.floored && (
              <Row
                label="Minimum payout floor"
                detail={`every task pays at least $${GIG_MIN_PAYOUT_USD.toFixed(2)}`}
                credits={gig.totalCredits}
                lime
              />
            )}
          </>
        ) : (
          <Row label="Your chosen reward" detail="custom amount" credits={rewardCredits} />
        )}
        {urgencyFactor > 1 && (
          <Row label="Schedule urgency" detail={`${pct(urgencyFactor)} for a tight window`} credits={afterUrgency - rewardCredits} />
        )}
        {weatherFactor > 1 && (
          <Row label="Filming conditions" detail={`${pct(weatherFactor)} for rough conditions`} credits={afterWeather - afterUrgency} />
        )}
        {tipCredits > 0 && <Row label="Tip" detail="added on top for the onlooker" credits={tipCredits} />}
      </ul>
      <div
        className="mt-2.5 flex items-baseline justify-between border-t pt-2.5"
        style={{ borderColor: "rgba(34,197,94,0.4)" }}
      >
        <span className="text-sm font-extrabold text-foreground">Total payout</span>
        <span className="font-display text-lg font-extrabold tabular-nums" style={{ color: LIME }}>
          {formatCredits(totalCredits)} · {formatCreditCash(totalCredits)}
        </span>
      </div>
    </div>
  );
}
