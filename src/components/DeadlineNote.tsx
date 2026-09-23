// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { Clock } from "lucide-react";

import { cn } from "@/lib/utils";

/** Human countdown like "2h 14m" or "48s", never negative. */
export function formatCountdown(msLeft: number) {
  const total = Math.max(0, Math.floor(msLeft / 1000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3600);
  const mins = Math.floor((total % 3600) / 60);
  const secs = total % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins}m`;
  return `${secs}s`;
}

/**
 * One line telling the poster exactly what the clock does when it runs out —
 * the automatic close / refund / payout that already happens server side.
 */
export function DeadlineNote({
  deadline,
  prefix,
  passed,
  className,
}: {
  /** ISO timestamp the automatic action fires at. */
  deadline: string | null | undefined;
  /** Sentence the remaining time is appended to, e.g. "Closes in". */
  prefix: string;
  /** What to say once the clock ran out but the sweep has not landed yet. */
  passed: string;
  className?: string;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!deadline) return null;
  const ends = new Date(deadline).getTime();
  if (!Number.isFinite(ends)) return null;

  const msLeft = ends - now;
  const urgent = msLeft > 0 && msLeft <= 10 * 60_000;

  return (
    <p
      className={cn(
        "flex items-center gap-1.5 text-xs tabular-nums",
        urgent ? "font-semibold text-foreground" : "text-muted-foreground",
        className,
      )}
    >
      <Clock className="size-3.5 shrink-0" />
      <span>{msLeft <= 0 ? passed : `${prefix} ${formatCountdown(msLeft)}`}</span>
    </p>
  );
}
