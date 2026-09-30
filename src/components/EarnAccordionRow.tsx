// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/** Collapsed-by-default row: one-line summary, chevron rotates when open. */
export function EarnAccordionRow({
  title,
  summary,
  children,
}: {
  title: ReactNode;
  summary?: ReactNode;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left"
      >
        <span className="min-w-0 truncate text-sm">
          <span className="font-bold text-foreground">{title}</span>
          {summary != null && <span className="text-muted-foreground"> — {summary}</span>}
        </span>
        <ChevronDown
          className={cn("size-4 shrink-0 text-muted-foreground transition-transform duration-200", open && "rotate-180")}
          aria-hidden
        />
      </button>
      {open && <div className="px-2 pb-2 [&>*]:mt-0">{children}</div>}
    </section>
  );
}
