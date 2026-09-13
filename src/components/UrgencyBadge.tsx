import { useEffect, useState } from "react";
import { Flame, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Minutes left at which a bounty starts stepping its payout up. */
const BUMP_WINDOW_MIN = 20;
/** How much of the base bounty each bump adds. */
const BUMP_RATE = 0.1;

/** The extra credits an unclaimed bounty has picked up as its clock runs down. */
export function surgeCredits(bounty: number, minutesLeft: number) {
  if (minutesLeft > BUMP_WINDOW_MIN || minutesLeft <= 0) return 0;
  const steps = Math.ceil((BUMP_WINDOW_MIN - minutesLeft) / 5);
  return Math.max(0, Math.round(bounty * BUMP_RATE * steps));
}

/**
 * Urgency treatment for open bounties: a live seconds countdown plus the
 * dynamic price bump that lands as the clock runs down, so hunters can see
 * a job getting more valuable in real time.
 */
export function UrgencyBadge({
  minutesLeft,
  bounty,
  className,
  compact = false,
}: {
  minutesLeft: number;
  bounty: number;
  className?: string;
  compact?: boolean;
}) {
  const [now, setNow] = useState(() => Date.now());
  const [endsAt] = useState(() => Date.now() + Math.max(0, minutesLeft) * 60_000);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msLeft = Math.max(0, endsAt - now);
  const secondsLeft = Math.floor(msLeft / 1000);
  const minsLeft = secondsLeft / 60;
  const surge = surgeCredits(bounty, minsLeft);
  const nextBumpIn = minsLeft > BUMP_WINDOW_MIN ? Math.ceil(minsLeft - BUMP_WINDOW_MIN) : null;

  if (secondsLeft === 0) return null;
  if (surge === 0 && nextBumpIn === null) return null;

  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-extrabold uppercase tracking-[0.1em] tabular-nums",
        compact ? "px-2 py-0.5 text-[0.58rem]" : "px-2.5 py-1 text-[0.65rem]",
        surge > 0
          ? "animate-pulse border-signal bg-signal text-signal-foreground motion-reduce:animate-none"
          : "border-signal/50 bg-signal/10 text-signal",
        className,
      )}
      role="status"
    >
      {surge > 0 ? (
        <>
          <Flame className={compact ? "size-3" : "size-3.5"} aria-hidden />+{surge} bumped ·{" "}
          {mins}:{String(secs).padStart(2, "0")}
        </>
      ) : (
        <>
          <TrendingUp className={compact ? "size-3" : "size-3.5"} aria-hidden /> Bumps in{" "}
          {nextBumpIn}m
        </>
      )}
    </span>
  );
}
