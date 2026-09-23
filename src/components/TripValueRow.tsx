// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Clock, Navigation, TrendingUp } from "lucide-react";

import { formatHourly, formatMinutes, formatUsd, tripValue } from "@/lib/trip-value";
import { cn } from "@/lib/utils";

/**
 * Ride-share style trip value shown next to the reward: how far the spot is,
 * how long getting there takes, what the onlooker keeps, and a rough hourly
 * rate for the whole round trip — so value is clear before claiming.
 */
export function TripValueRow({
  miles,
  distanceLabel,
  credits,
  onSiteMinutes,
  compact = false,
  className,
}: {
  /** Straight-line distance from the viewer to the spot. */
  miles: number;
  /** Already formatted in the viewer's own unit, e.g. "3.2 mi". */
  distanceLabel: string;
  /** Total bounty pool, before the platform fee. */
  credits: number;
  /** Filming time the bounty asks for, when it states one. */
  onSiteMinutes?: number | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const trip = tripValue({ miles, credits, onSiteMinutes });

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-2.5 gap-y-1 rounded-xl border border-border bg-surface-raised px-2.5 py-1.5",
        compact ? "text-[0.68rem]" : "text-xs",
        className,
      )}
    >
      <span className="flex items-center gap-1 font-bold text-foreground">
        <Navigation className="size-3 shrink-0" aria-hidden /> {distanceLabel} away
      </span>
      <span className="flex items-center gap-1 font-medium text-muted-foreground">
        <Clock className="size-3 shrink-0" aria-hidden /> ~{formatMinutes(trip.travelMinutes)} to get
        there
      </span>
      <span className="font-bold text-foreground">{formatUsd(trip.payoutUsd)} to you</span>
      <span
        className="flex items-center gap-1 font-bold text-foreground"
        title={`Estimated from ${formatMinutes(trip.totalMinutes)} total: ${formatMinutes(trip.travelMinutes)} each way plus ${formatMinutes(trip.onSiteMinutes)} filming.`}
      >
        <TrendingUp className="size-3 shrink-0" aria-hidden /> ≈{formatHourly(trip.hourlyUsd)}
      </span>
      <span className="text-[0.62rem] font-medium uppercase tracking-[0.1em] text-muted-foreground">
        est.
      </span>
    </div>
  );
}
