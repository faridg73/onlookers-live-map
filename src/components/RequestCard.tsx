import { Clock, Eye, MapPin, Camera, Video } from "lucide-react";
import { BountyVideoDialog } from "@/components/BountyVideoDialog";
import { BoostBounty } from "@/components/BoostBounty";
import { useBoosts } from "@/lib/boosts-store";
import { categoryById, formatAgo, statusLabel, type LiveRequest } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

export function RequestCard({
  request,
  onClaim,
  active,
  onSelect,
}: {
  request: LiveRequest;
  onClaim?: (id: string) => void;
  active?: boolean;
  onSelect?: (id: string) => void;
}) {
  const done = request.status === "fulfilled";
  const { boostOf } = useBoosts();
  const boosted = boostOf(request.id);
  const pool = request.bounty + boosted;
  return (
    <article
      onClick={() => onSelect?.(request.id)}
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-surface p-4 transition-colors",
        active && "border-signal/70 bg-surface-raised",
        onSelect && "cursor-pointer hover:border-signal/50",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                request.status === "open" && "text-live",
                request.status === "claimed" && "text-signal",
              )}
            >
              {request.status === "open" && (
                <span className="size-1.5 animate-ping-slow rounded-full bg-live" />
              )}
              {statusLabel[request.status]}
            </span>
            <span className="text-border">/</span>
            <span>{formatAgo(request.minutesAgo)}</span>
          </div>
          <h3 className="mt-2 font-display text-lg leading-tight text-foreground">{request.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5" /> {request.place}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border border-signal/40 bg-signal/10 px-3 py-2 text-center">
          <div className="font-display text-xl leading-none text-signal">${pool}</div>
          <div className="mt-1 text-[0.6rem] uppercase tracking-[0.16em] text-signal/70">
            {boosted > 0 ? `+$${boosted} boosted` : "bounty"}
          </div>
        </div>
      </div>

      {categoryById(request.category) && (
        <span className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          <span>{categoryById(request.category)!.emoji}</span>
          {categoryById(request.category)!.label}
        </span>
      )}

      {(request.instructions || request.note) && (
        <div className="mt-3 rounded-xl border border-border bg-surface-raised p-3">
          <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground/70">
            Instructions
          </div>
          <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
            {request.instructions || request.note}
          </p>
        </div>
      )}

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/70 pt-3">
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <Eye className="size-3.5" /> {request.watchers}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Camera className="size-3.5" /> {request.responses}
          </span>
          {!done && (
            <span className="inline-flex items-center gap-1.5">
              <Clock className="size-3.5" /> {request.expiresInMin}m left
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <BountyVideoDialog request={request}>
            <button
              type="button"
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Video className="size-3.5" /> Videos
            </button>
          </BountyVideoDialog>
        {onClaim && (
          <button
            type="button"
            disabled={done}
            onClick={(e) => {
              e.stopPropagation();
              onClaim(request.id);
            }}
            className="rounded-full bg-signal px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-signal-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {done ? "Closed" : request.status === "claimed" ? "Add shot" : "Claim"}
          </button>
        )}
        </div>
      </div>
    </article>
  );
}
