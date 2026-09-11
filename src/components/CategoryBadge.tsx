import { categoryById, type CategoryId } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

/** Colour-coded label so each request type is recognisable at a glance. */
export function CategoryBadge({
  category,
  compact,
  className,
}: {
  category?: CategoryId | null;
  compact?: boolean;
  className?: string;
}) {
  const meta = categoryById(category);
  if (!meta) return null;
  const hue = `var(--cat-${meta.id})`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-semibold uppercase tracking-[0.14em]",
        compact ? "px-2 py-0.5 text-[0.55rem]" : "px-2.5 py-1 text-[0.65rem]",
        className,
      )}
      style={{
        color: hue,
        borderColor: `color-mix(in oklch, ${hue} 55%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${hue} 14%, transparent)`,
      }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {compact ? meta.label.split(" ")[0] : meta.label}
    </span>
  );
}
