// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { CoinsIcon, Loader2, TrendingUp } from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import {
  CREDITS_PER_USD,
  PLATFORM_FEE_RATE,
  creditsToUsdValue,
  fetchMyEarnings,
  usd,
  type EarningsSummary,
} from "@/lib/earnings";

/** My Earnings: everything earned, the fee taken out, and what it is worth in cash. */
export function MyEarningsCard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState<EarningsSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setSummary(null);
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    void fetchMyEarnings()
      .then((next) => {
        if (alive) setSummary(next);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return null;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          My earnings
        </span>
        <TrendingUp className="size-4 text-live" />
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your earnings…
        </p>
      ) : !summary || summary.entries === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
          Nothing earned yet. Accepted clips, live views and tips show up here with the exact fee
          and cash value.
        </p>
      ) : (
        <>
          <div className="mt-2 flex items-end gap-3">
            <span className="flex items-center gap-2 font-display text-4xl text-foreground">
              <CoinsIcon className="size-6 text-live" />
              {summary.netCredits}
            </span>
            <span className="pb-1 text-sm font-semibold text-live">
              ≈ {usd(creditsToUsdValue(summary.netCredits))} cash
            </span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Total credits earned after fees · {CREDITS_PER_USD} Credits = $1.00 USD
          </p>

          <dl className="mt-4 space-y-2 border-t border-border pt-3 text-sm">
            <Row
              label="Total earned (before fee)"
              value={`${summary.grossCredits} Credits`}
              cash={usd(creditsToUsdValue(summary.grossCredits))}
            />
            <Row
              label={`Platform fee (${Math.round(PLATFORM_FEE_RATE * 100)}%)`}
              value={`− ${summary.feeCredits} Credits`}
              cash={`− ${usd(creditsToUsdValue(summary.feeCredits))}`}
              tone="fee"
            />
            <Row
              label="Paid into your wallet"
              value={`${summary.netCredits} Credits`}
              cash={usd(creditsToUsdValue(summary.netCredits))}
              tone="net"
            />
            <Row
              label="Available to cash out now"
              value={`${summary.availableCredits} Credits`}
              cash={usd(creditsToUsdValue(summary.availableCredits))}
            />
            {summary.pendingCredits > 0 && (
              <Row
                label="Cash out in progress"
                value={`${summary.pendingCredits} Credits`}
                cash={usd(summary.pendingUsd)}
              />
            )}
            {summary.cashedOutCredits > 0 && (
              <Row
                label="Already paid to your bank"
                value={`${summary.cashedOutCredits} Credits`}
                cash={usd(summary.cashedOutUsd)}
              />
            )}
          </dl>

          <p className="mt-3 text-[0.7rem] leading-relaxed text-muted-foreground">
            Every payout is shown in full: the bounty amount, the{" "}
            {Math.round(PLATFORM_FEE_RATE * 100)}% platform fee, and the credits you keep. Nothing
            else is deducted.
          </p>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  cash,
  tone,
}: {
  label: string;
  value: string;
  cash: string;
  tone?: "fee" | "net";
}) {
  const valueTone =
    tone === "fee" ? "text-urgent" : tone === "net" ? "text-live" : "text-foreground";
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="shrink-0 text-right">
        <span className={`block text-sm font-semibold ${valueTone}`}>{value}</span>
        <span className="text-[0.65rem] text-muted-foreground">{cash}</span>
      </dd>
    </div>
  );
}
