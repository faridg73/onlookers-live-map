import { BadgeCheck, Clock, Target } from "lucide-react";
import { HunterBadge } from "@/components/HunterBadge";
import { responseLabel, type TrustStats } from "@/lib/trust";
import { cn } from "@/lib/utils";

/** Verified status, completion rate and typical response speed at a glance. */
export function TrustBadge({ stats, className }: { stats: TrustStats; className?: string }) {
  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      <HunterBadge level={stats.hunterLevel} />
      {stats.verified && (
        <span
          className="inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
          title="Verified: 3+ finished jobs with an 80%+ completion rate"
        >
          <BadgeCheck className="size-3" /> Verified
        </span>
      )}
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Target className="size-3" /> {stats.completionRate}% finished
      </span>
      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
        <Clock className="size-3" /> {responseLabel(stats.avgResponseMinutes)}
      </span>
    </div>
  );
}
