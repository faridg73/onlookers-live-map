import { categoryById, type CategoryId } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

/** Colour-coded label so each request type is recognisable at a glance. */
export function CategoryBadge({
  category,
  compact,
  className,
}: {
  category?: CategoryId | null | undefined;
  compact?: boolean;
  className?: string;
}) {
  const meta = categoryById(category);
  if (!meta) return null;
  const hue = `var(--cat-${meta.id})`;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border font-bold uppercase tracking-[0.12em]",
        compact ? "px-2 py-0.5 text-[0.6rem]" : "px-2.5 py-1 text-[0.7rem]",
        className,
      )}
      style={{
        color: hue,
        borderColor: `color-mix(in oklch, ${hue} 65%, transparent)`,
        backgroundColor: `color-mix(in oklch, ${hue} 20%, transparent)`,
      }}
    >
      <span aria-hidden>{meta.emoji}</span>
      {compact ? meta.label.split(" ")[0] : meta.label}
    </span>
  );
}
