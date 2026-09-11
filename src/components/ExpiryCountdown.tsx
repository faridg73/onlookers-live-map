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
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  const expired = msLeft === 0;
  const urgent = !expired && totalSeconds <= 5 * 60;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-xs font-semibold tabular-nums",
        highlight ? "border" : "",
        className,
      )}
      style={
        urgent
          ? {
              color: "var(--urgent)",
              borderColor: "color-mix(in oklch, var(--urgent) 60%, transparent)",
              backgroundColor: "color-mix(in oklch, var(--urgent) 14%, transparent)",
            }
          : highlight
            ? {
                color: "var(--color-signal)",
                borderColor: "color-mix(in oklch, var(--color-signal) 45%, transparent)",
                backgroundColor: "color-mix(in oklch, var(--color-signal) 10%, transparent)",
              }
            : undefined
      }
      aria-label={expired ? "This request has expired" : `${mins} minutes ${secs} seconds left`}
    >
      {urgent ? (
        <Flame className={cn("size-3.5", !expired && "animate-pulse")} />
      ) : (
        <Clock className="size-3.5" />
      )}
      {expired ? "Expired" : `${mins}:${String(secs).padStart(2, "0")} left`}
    </span>
  );
}
