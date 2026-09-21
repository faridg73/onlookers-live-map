// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useMemo, useState } from "react";
import { Clock, Flame } from "lucide-react";
import { cn } from "@/lib/utils";

/** Bounties at or above this payout get the loud urgency treatment. */
export const HIGH_BOUNTY = 25;

/** Live ticking countdown to the moment a request stops accepting clips. */
export function ExpiryCountdown({
  minutesLeft,
  highlight,
  className,
}: {
  minutesLeft: number;
  /** High-value bounty — show the bolder, animated treatment */
  highlight?: boolean;
  className?: string;
}) {
  const endsAt = useMemo(() => Date.now() + Math.max(0, minutesLeft) * 60_000, [minutesLeft]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = Math.max(0, endsAt - now);
  const totalSeconds = Math.floor(msLeft / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  const expired = msLeft === 0;
  const urgent = !expired && totalSeconds <= 5 * 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  /* Always h:mm:ss (or m:ss under an hour) so the digits never jump around. */
  const clock = hours > 0 ? `${hours}:${pad(mins)}:${pad(secs)}` : `${mins}:${pad(secs)}`;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-sm font-bold tabular-nums [font-variant-numeric:tabular-nums_slashed-zero] [font-feature-settings:'tnum'_1]",
        highlight ? "border-2" : "text-foreground",
        className,
      )}
      style={
        urgent
          ? {
              color: "white",
              borderColor: "color-mix(in oklch, var(--urgent) 55%, black)",
              backgroundColor: "color-mix(in oklch, var(--urgent) 55%, black)",
              textShadow: "0 1px 2px rgb(0 0 0 / 0.45)",
            }
          : highlight
            ? {
                color: "var(--signal-foreground)",
                borderColor: "var(--color-signal)",
                backgroundColor: "var(--color-signal)",
              }
            : undefined
      }
      aria-label={
        expired
          ? "This request has expired"
          : `${hours > 0 ? `${hours} hours ` : ""}${mins} minutes ${secs} seconds left`
      }
    >
      {urgent ? (
        <Flame className={cn("size-3.5", !expired && "animate-pulse")} />
      ) : (
        <Clock className="size-3.5" />
      )}
      {expired ? "Expired" : `${clock} left`}
    </span>
  );
}
