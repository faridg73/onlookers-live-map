import { Check } from "lucide-react";
import {
  PRIMARY_CATEGORIES,
  subOptionsFor,
  type CategoryId,
  type SubOption,
} from "@/lib/onlooker";
import { cn } from "@/lib/utils";

export type CategoryPickerValue = CategoryId | "all";

/**
 * One shared 3x3 category grid used by both /feed and /post, with the selected
 * category's sub-options revealed straight underneath for refinement.
 */
export function CategoryPicker({
  value,
  onChange,
  sub,
  onSubChange,
  includeAll = false,
  allLabel = "All types",
}: {
  value: CategoryPickerValue;
  onChange: (id: CategoryPickerValue) => void;
  sub: string | null;
  onSubChange: (subId: string | null) => void;
  includeAll?: boolean;
  allLabel?: string;
}) {
  const subs: SubOption[] = value === "all" ? [] : subOptionsFor(value);

  const select = (id: CategoryPickerValue) => {
    onChange(id);
    onSubChange(null);
  };

  return (
    <div className="space-y-2">
      {includeAll && (
        <button
          type="button"
          onClick={() => select("all")}
          aria-pressed={value === "all"}
          className={cn(
            "w-full rounded-xl border-2 py-2 text-xs font-extrabold uppercase tracking-[0.14em] transition-colors",
            value === "all"
              ? "border-signal bg-signal text-signal-foreground"
              : "border-border bg-surface text-muted-foreground",
          )}
        >
          {allLabel}
        </button>
      )}

      <div className="grid grid-cols-3 gap-2">
        {PRIMARY_CATEGORIES.map((c) => {
          const on = value === c.id;
          const hue = `var(--cat-${c.id})`;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => select(c.id)}
              aria-pressed={on}
              className={cn(
                "flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border-2 p-2 text-center transition-all",
                on ? "shadow-[0_10px_28px_-16px_black]" : "border-border bg-surface-raised",
              )}
              style={
                on
                  ? {
                      borderColor: hue,
                      backgroundColor: `color-mix(in oklch, ${hue} 22%, oklch(0.18 0 0))`,
                    }
                  : undefined
              }
            >
              <span
                className="flex size-8 items-center justify-center rounded-xl text-base"
                style={{
                  backgroundColor: `color-mix(in oklch, ${hue} 82%, black)`,
                  boxShadow: `0 0 0 2px color-mix(in oklch, ${hue} 40%, transparent)`,
                }}
                aria-hidden
              >
                {c.emoji}
              </span>
              <span
                className={cn(
                  "text-[0.68rem] font-extrabold leading-tight tracking-tight",
                  on ? "text-foreground" : "text-foreground/80",
                )}
              >
                {c.short}
              </span>
            </button>
          );
        })}
      </div>

      {subs.length > 0 && (
        <div className="rounded-2xl border border-border bg-surface p-2.5">
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-muted-foreground">
            Narrow it down
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {subs.map((s) => {
              const on = sub === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onSubChange(on ? null : s.id)}
                  aria-pressed={on}
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-[0.72rem] font-bold transition-colors",
                    on
                      ? "border-signal bg-signal text-signal-foreground"
                      : "border-border bg-surface-raised text-foreground/80",
                  )}
                >
                  {on && <Check className="size-3" strokeWidth={3.2} aria-hidden />}
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
