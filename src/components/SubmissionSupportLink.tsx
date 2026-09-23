// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link } from "@tanstack/react-router";
import { LifeBuoy } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Always-visible escape hatch on every capture / upload screen, so an onlooker
 * stuck mid-submission can reach a human instead of losing the job silently.
 */
export function SubmissionSupportLink({
  className,
  tone = "muted",
}: {
  className?: string;
  /** "light" sits on the black camera screen, "muted" on app surfaces. */
  tone?: "muted" | "light";
}) {
  return (
    <Link
      to="/contact"
      className={cn(
        "inline-flex items-center gap-1.5 text-xs font-semibold underline underline-offset-4",
        tone === "light" ? "text-white/80 hover:text-white" : "text-muted-foreground hover:text-foreground",
        className,
      )}
    >
      <LifeBuoy className="size-3.5 shrink-0" aria-hidden />
      Submission failed? Contact support
    </Link>
  );
}
