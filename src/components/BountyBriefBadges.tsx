import { CloudRain, Radio, Timer, Video, Zap } from "lucide-react";
import type { LiveRequest } from "@/lib/onlooker";
import { conditionByMultiplier } from "@/lib/bounty-pricing";
import { cn } from "@/lib/utils";

const TIER_LABEL: Record<string, string> = {
  fast_catch: "Fast Catch",
  priority_hunt: "Priority Hunt",
};

function startLabel(iso: string) {
  const at = new Date(iso);
  if (Number.isNaN(at.getTime())) return null;
  return at.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/**
 * The capture brief an onlooker needs at a glance: reward tier, live vs
 * recorded, how many minutes of footage, when to start and how rough the
 * conditions are priced to be.
 */
export function BountyBriefBadges({
  request,
  compact = false,
}: {
  request: LiveRequest;
  compact?: boolean;
}) {
  const tier = request.bountyTier && TIER_LABEL[request.bountyTier];
  const isClip = request.bountyType === "pre_recorded_clip";
  const minutes = request.captureMinutes;
  const weather = request.weatherMultiplier ?? 1;
  const start = request.scheduledStartAt ? startLabel(request.scheduledStartAt) : null;

  if (!tier && !minutes && !start && weather <= 1 && !request.bountyType) return null;

  const chip = cn(
    "inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised font-bold uppercase tracking-[0.1em] text-foreground/80",
    compact ? "px-2 py-0.5 text-[0.58rem]" : "px-2.5 py-1 text-[0.65rem]",
  );
  const icon = compact ? "size-3" : "size-3.5";

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", compact ? "mt-2" : "mt-2")}>
      {tier && (
        <span
          className={cn(
            chip,
            "border-signal bg-signal text-signal-foreground font-extrabold",
          )}
        >
          <Zap className={icon} /> {tier}
        </span>
      )}
      <span className={chip}>
        {isClip ? <Video className={icon} /> : <Radio className={cn(icon, "text-live")} />}
        {isClip ? "Recorded clip" : "Live stream"}
      </span>
      {minutes ? (
        <span className={chip}>
          <Timer className={icon} /> {minutes} min
        </span>
      ) : null}
      {start && (
        <span className={chip}>
          <Timer className={icon} /> Starts {start}
        </span>
      )}
      {weather > 1 && (
        <span className={chip}>
          <CloudRain className={icon} /> {conditionByMultiplier(weather).label}
        </span>
      )}
    </div>
  );
}
