import { Eye, MapPin, Camera, Video, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { refundBounty } from "@/lib/bounty-escrow";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { BountyVideoDialog } from "@/components/BountyVideoDialog";
import { BoostBounty } from "@/components/BoostBounty";
import { ShareBountyButton } from "@/components/ShareBountyButton";
import { useBoosts } from "@/lib/boosts-store";
import { CategoryBadge } from "@/components/CategoryBadge";
import { AccessPasscode } from "@/components/AccessPasscode";
import { BountyChat } from "@/components/BountyChat";
import { ExpiryCountdown, HIGH_BOUNTY } from "@/components/ExpiryCountdown";
import { formatAgo, statusLabel, type LiveRequest } from "@/lib/onlooker";
import { cn } from "@/lib/utils";


export function RequestCard({
  request,
  onClaim,
  active,
  onSelect,
  compact = false,
  distanceLabel,
}: {
  request: LiveRequest;
  onClaim?: (id: string) => void;
  active?: boolean;
  onSelect?: (id: string) => void;
  compact?: boolean;
  /** Pre-computed "4.2 mi" style label shown under the location. */
  distanceLabel?: string;
}) {
  const expired = request.status === "expired";
  const done = isClosed(request);
  const [cancelling, setCancelling] = useState(false);
  const { remove } = useOnlooker();
  const { boostOf } = useBoosts();
  const boosted = boostOf(request.id);
  const pool = request.bounty + boosted;

  if (compact) {
    return (
      <article className="w-full cursor-pointer rounded-lg border border-border bg-surface p-3 text-left transition-colors hover:border-signal/50">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <span
                className={cn(
                  "shrink-0 rounded-md px-2 py-1 text-[0.62rem] font-extrabold uppercase",
                  request.status === "open" && "bg-live text-background",
                  request.status === "claimed" && "bg-signal text-signal-foreground",
                  done && "bg-surface-raised text-muted-foreground",
                )}
              >
                {expired ? "Expired" : done ? "Closed" : request.status === "claimed" ? "Claimed" : "Active"}
              </span>
              <CategoryBadge category={request.category} compact />
            </div>
            <h3 className="mt-2 truncate font-display text-base font-bold text-foreground">
              {request.title}
            </h3>
            <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{request.place}</span>
            </p>
          </div>
          <div className="shrink-0 text-right">
            <div className="font-display text-2xl font-extrabold leading-none text-signal">${pool}</div>
            {!done && <div className="mt-2"><ExpiryCountdown minutesLeft={request.expiresInMin} /></div>}
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
          <span onClick={(e) => e.stopPropagation()}>
            <ShareBountyButton request={request} />
          </span>
          <span className="text-xs font-bold uppercase tracking-[0.12em] text-signal">
            Tap for details
          </span>
        </div>
      </article>
    );
  }

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
          <div className="flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.16em] text-foreground/70">
            <span
              className={cn(
                "inline-flex items-center gap-1.5 font-bold",
                request.status === "open" && "text-live",
                request.status === "claimed" && "text-signal",
                expired && "text-muted-foreground",
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
          <h3 className="mt-2 font-display text-lg font-bold leading-tight text-foreground">{request.title}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm font-medium text-foreground/70">
            <MapPin className="size-3.5" /> {request.place}
          </p>
        </div>

        <div className="shrink-0 rounded-xl border-2 border-signal/60 bg-signal/15 px-3 py-2 text-center">
          <div className="font-display text-2xl font-extrabold leading-none tabular-nums text-signal">${pool}</div>
          <div className="mt-1 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-signal">
            {boosted > 0 ? `+$${boosted} boosted` : "bounty"}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span
          className={cn(
            "rounded-full border px-2.5 py-1 text-[0.65rem] font-bold uppercase tracking-[0.12em]",
            expired && "border-border bg-surface-raised text-muted-foreground",
            !expired && done && "border-border bg-foreground text-background",
            request.status === "claimed" && !done && "border-signal bg-signal font-extrabold text-signal-foreground",
            request.status === "open" && !done && "border-live bg-live font-extrabold text-background",
          )}
        >
          {expired ? "Expired" : done ? "Closed" : request.status === "claimed" ? "Claimed" : "Active"}
        </span>
        <CategoryBadge category={request.category} />
        {!done && (
          <ExpiryCountdown minutesLeft={request.expiresInMin} highlight={pool >= HIGH_BOUNTY} />
        )}
        {!done && pool >= HIGH_BOUNTY && (
          <span className="rounded-full border border-signal bg-signal px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-signal-foreground">
            High bounty
          </span>
        )}
      </div>

      {expired && (
        <p className="mt-3 rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
          This bounty ran out of time. Submissions and chip-ins are closed and the deposit went
          back to the requester.
        </p>
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

      <AccessPasscode request={request} />

      <BountyChat request={request} />

      {!done && (
        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-raised px-3 py-2">
          <span className="text-xs text-muted-foreground">Chip in to raise the payout</span>
          <BoostBounty requestId={request.id} />
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
        </div>
        <div className="flex items-center gap-2">
          {/* Cancelling is only allowed while nobody has claimed or submitted. */}
          {request.dbId && request.status === "open" && (
            <button
              type="button"
              disabled={cancelling}
              onClick={async (e) => {
                e.stopPropagation();
                setCancelling(true);
                try {
                  const requestId = request.dbId;
                  if (!requestId) return;
                  const balance = await refundBounty(requestId);
                  remove(request.id);
                  toast.success("Request cancelled", {
                    description: `$${request.bounty} refunded — wallet balance $${balance.toFixed(2)}.`,
                  });
                } catch (error) {
                  toast.error(error instanceof Error ? error.message : "Could not cancel.");
                } finally {
                  setCancelling(false);
                }
              }}
              className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
            >
              <X className="size-3.5" /> {cancelling ? "Refunding…" : "Cancel"}
            </button>
          )}
          <ShareBountyButton request={request} />
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
            {expired ? "Expired" : done ? "Closed" : request.status === "claimed" ? "Add shot" : "Claim"}
          </button>
        )}
        </div>
      </div>
    </article>
  );
}
