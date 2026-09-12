import { Shield } from "lucide-react";
import { tierForLevel } from "@/lib/gamification";
import { cn } from "@/lib/utils";

/** Bronze → Elite status badge showing how reliable a reporter is. */
export function HunterBadge({
  level,
  className,
  showLevel = true,
}: {
  level: number;
  className?: string;
  showLevel?: boolean;
}) {
  const tier = tierForLevel(level);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em]",
        tier.badge,
        className,
      )}
      title={`${tier.name} onlooker — level ${level}`}
    >
      <Shield className="size-3" />
      {tier.name}
      {showLevel && <span className="opacity-80">Lv {level}</span>}
    </span>
  );
}
