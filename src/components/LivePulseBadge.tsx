// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { cn } from "@/lib/utils";

/**
 * Prominent pulsing "live now" indicator for active bounties — a radiating
 * dot plus bold label so hunters instantly spot requests waiting for capture.
 */
export function LivePulseBadge({
  className,
  compact = false,
}: {
  className?: string;
  /** Smaller footprint for tight rows like the map's nearby list. */
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full border border-live/70 bg-live/15 font-extrabold uppercase tracking-[0.14em] text-live",
        compact ? "px-2 py-0.5 text-[0.58rem]" : "px-2.5 py-1 text-[0.65rem]",
        className,
      )}
    >
      <span className="relative flex size-2">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-live opacity-75" />
        <span className="relative inline-flex size-2 rounded-full bg-live" />
      </span>
      Live now
    </span>
  );
}
