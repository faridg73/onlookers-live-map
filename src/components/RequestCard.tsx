import { Clock, Eye, MapPin, Camera } from "lucide-react";
import { formatAgo, statusLabel, type LiveRequest } from "@/lib/onlooker";
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
          <div className="font-display text-xl leading-none text-signal">${request.bounty}</div>
          <div className="mt-1 text-[0.6rem] uppercase tracking-[0.16em] text-signal/70">bounty</div>
        </div>
      </div>

      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{request.note}</p>

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
    </article>
  );
}
