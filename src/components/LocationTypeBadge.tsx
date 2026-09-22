// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { ShieldCheck } from "lucide-react";

import { locationTypeById } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

/**
 * Small trust tag sitting next to a bounty's address, showing how the poster
 * classified the spot. Private homes only ever appear as "Owner-Authorized".
 */
export function LocationTypeBadge({
  locationType,
  className,
}: {
  locationType?: string | null | undefined;
  className?: string;
}) {
  const type = locationTypeById(locationType);
  if (!type) return null;
  return (
    <span
      title={type.blurb}
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full border border-border bg-surface-raised px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.08em] text-muted-foreground",
        className,
      )}
    >
      <ShieldCheck className="size-3 shrink-0" aria-hidden />
      <span aria-hidden>{type.emoji}</span>
      {type.label}
    </span>
  );
}
