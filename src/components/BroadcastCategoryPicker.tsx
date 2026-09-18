import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Layers3 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  BROADCAST_CATEGORIES,
  broadcastCategoryById,
  type BroadcastCategoryId,
} from "@/lib/broadcast-categories";
import { cn } from "@/lib/utils";

export function BroadcastCategoryPicker({
  categoryId,
  subcategory,
  onCategoryChange,
  onSubcategoryChange,
  allowAll = false,
  laneLabel = "Broadcast lane",
  menuLabel = "Choose a broadcast lane",
  allLabel = "All categories",
}: {
  categoryId: BroadcastCategoryId | null;
  subcategory: string | null;
  onCategoryChange: (categoryId: BroadcastCategoryId | null) => void;
  onSubcategoryChange: (subcategory: string | null) => void;
  allowAll?: boolean;
  laneLabel?: string;
  menuLabel?: string;
  allLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const selected = categoryId ? broadcastCategoryById(categoryId) : null;

  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("pointerdown", close);
    return () => window.removeEventListener("pointerdown", close);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <Button
        type="button"
        variant="outline"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="h-auto min-h-14 w-full justify-start gap-3 border-border bg-surface-raised px-3 py-2.5 text-left hover:border-signal/60 hover:bg-surface-raised"
      >
        <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-signal/30 bg-signal/10 text-lg">
          {selected?.icon ?? "🌐"}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[0.6rem] font-extrabold uppercase text-signal">
            {laneLabel}
          </span>
          <span className="block truncate text-sm font-extrabold text-foreground">
            {selected?.label ?? allLabel}
          </span>
        </span>
        <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
      </Button>

      {open && (
        <div
          role="listbox"
          aria-label="Broadcast categories"
          className="absolute inset-x-0 top-[calc(100%+0.4rem)] z-40 max-h-80 overflow-y-auto overscroll-contain rounded-lg border border-signal/35 bg-popover p-1.5 shadow-2xl"
        >
          <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-popover px-2 py-2 text-[0.62rem] font-extrabold uppercase text-muted-foreground">
            <Layers3 className="size-3.5 text-signal" /> {menuLabel}
          </div>
          {allowAll && (
            <Button
              type="button"
              variant="ghost"
              role="option"
              aria-selected={categoryId === null}
              onClick={() => {
                onCategoryChange(null);
                onSubcategoryChange(null);
                setOpen(false);
              }}
              className={cn(
                "h-auto min-h-11 w-full justify-start gap-2.5 whitespace-normal rounded-md px-2 py-2 text-left",
                categoryId === null ? "bg-signal/10 text-signal" : "text-foreground hover:bg-accent",
              )}
            >
              <span className="w-6 shrink-0 text-center text-base" aria-hidden>🌐</span>
              <span className="min-w-0 flex-1 text-xs font-bold leading-snug">{allLabel}</span>
              {categoryId === null && <Check className="size-4 shrink-0" strokeWidth={3} />}
            </Button>
          )}
          {BROADCAST_CATEGORIES.map((category, index) => {
            const active = category.id === categoryId;
            return (
              <Button
                key={category.id}
                type="button"
                variant="ghost"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onCategoryChange(category.id);
                  onSubcategoryChange(null);
                  setOpen(false);
                }}
                className={cn(
                  "h-auto min-h-11 w-full justify-start gap-2.5 whitespace-normal rounded-md px-2 py-2 text-left",
                  active ? "bg-signal/10 text-signal" : "text-foreground hover:bg-accent",
                )}
              >
                <span className="w-6 shrink-0 text-center text-base" aria-hidden>
                  {category.icon}
                </span>
                <span className="min-w-0 flex-1 text-xs font-bold leading-snug">
                  <span className="mr-1 text-muted-foreground">{index + 1}.</span>
                  {category.label}
                </span>
                {active && <Check className="size-4 shrink-0" strokeWidth={3} />}
              </Button>
            );
          })}
        </div>
      )}

      {selected && <div className="mt-3">
        <p className="text-[0.62rem] font-extrabold uppercase text-muted-foreground">
          Refine your vibe
        </p>
        <div className="mt-2 flex flex-wrap gap-2" aria-label={`${selected.label} subcategories`}>
          <Button
            type="button"
            size="sm"
            variant="outline"
            aria-pressed={subcategory === null}
            onClick={() => onSubcategoryChange(null)}
            className={cn(
              "h-8 rounded-full px-3 text-[0.65rem] font-extrabold uppercase",
              subcategory === null
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            No vibe
          </Button>
          {selected.subcategories.map((option) => {
            const active = subcategory === option;
            return (
              <Button
                key={option}
                type="button"
                size="sm"
                variant="outline"
                aria-pressed={active}
                onClick={() => onSubcategoryChange(active ? null : option)}
                className={cn(
                  "h-8 rounded-full px-3 text-[0.65rem] font-extrabold uppercase",
                  active
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-border bg-surface text-muted-foreground hover:border-signal/60 hover:text-foreground",
                )}
              >
                {active && <Check className="size-3" strokeWidth={3} />}
                {option}
              </Button>
            );
          })}
        </div>
      </div>}
    </div>
  );
}