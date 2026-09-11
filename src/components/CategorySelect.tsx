import { Check } from "lucide-react";
import { CATEGORIES, type CategoryId } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

/**
 * Vibrant colour-coded category picker: each option carries its own hue so the
 * type of request is readable at a glance, with bold high-contrast labels.
 */
export function CategorySelect({
  value,
  onChange,
}: {
  value: CategoryId;
  onChange: (id: CategoryId) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {CATEGORIES.map((c) => {
        const on = value === c.id;
        const hue = `var(--cat-${c.id})`;
        return (
          <button
            key={c.id}
            type="button"
            onClick={() => onChange(c.id)}
            aria-pressed={on}
            className={cn(
              "relative flex items-center gap-2.5 rounded-2xl border-2 p-2.5 text-left transition-all",
              on ? "shadow-[0_10px_28px_-14px_black]" : "border-border bg-surface-raised",
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
              className="flex size-9 shrink-0 items-center justify-center rounded-xl text-lg"
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
                "min-w-0 flex-1 text-[0.78rem] font-extrabold leading-tight tracking-tight",
                on ? "text-foreground" : "text-foreground/80",
              )}
            >
              {c.label}
            </span>
            {on && (
              <Check className="size-4 shrink-0" strokeWidth={3.2} style={{ color: hue }} />
            )}
          </button>
        );
      })}
    </div>
  );
}
