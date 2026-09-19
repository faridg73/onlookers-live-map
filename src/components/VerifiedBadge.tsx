// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { BadgeCheck } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Verified creator mark shown next to a name. `icon` is the compact form used in
 * feeds, chat and stream overlays; `pill` spells the word out on profile headers.
 */
export function VerifiedBadge({
  variant = "icon",
  className,
  title = "Verified creator",
}: {
  variant?: "icon" | "pill";
  className?: string;
  title?: string;
}) {
  if (variant === "pill") {
    return (
      <span
        title={title}
        className={cn(
          "inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-signal-foreground",
          className,
        )}
      >
        <BadgeCheck className="size-3" aria-hidden />
        Verified
      </span>
    );
  }

  return (
    <span title={title} className="inline-flex shrink-0 items-center">
      <BadgeCheck
        role="img"
        aria-label={title}
        className={cn("size-4 shrink-0 text-signal", className)}
      />
    </span>
  );
}
