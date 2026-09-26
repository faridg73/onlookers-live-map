// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
import { FollowButton } from "@/components/FollowButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/use-auth";
import { fetchReputationCard, handleFor, openDirectMessage, type ReputationCard } from "@/lib/reputation-cards";

/**
 * Minimal strip a viewer opens by tapping the streamer during a live stream.
 * The stream keeps playing behind it. Intentionally only identity + follow + message.
 */
export function LiveCreatorStrip({
  hostId,
  hostName,
  open,
  onOpenChange,
}: {
  hostId: string;
  hostName: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { user } = useAuth();
  const [card, setCard] = useState<ReputationCard | null>(null);

  useEffect(() => {
    if (!open) return;
    let alive = true;
    void fetchReputationCard(hostId).then((c) => alive && setCard(c));
    return () => {
      alive = false;
    };
  }, [open, hostId]);

  // Never shown to the streamer about themselves.
  if (user?.id === hostId) return null;

  const name = card?.name ?? hostName;
  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[25vh] min-h-0 border-border bg-surface pb-[max(1rem,calc(env(safe-area-inset-bottom)+0.75rem))]">
        <DrawerTitle className="sr-only">{name}</DrawerTitle>
        <div className="flex items-center gap-3 px-4 pt-2">
          {card?.avatarUrl ? (
            <img src={card.avatarUrl} alt={`${name} avatar`} className="size-12 shrink-0 rounded-full object-cover" />
          ) : (
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised font-display text-base text-foreground">
              {name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-1 truncate font-bold text-foreground">
              <span className="truncate">{name}</span>
              {card?.verified && <VerifiedBadge className="size-3.5" />}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {handleFor({ handle: card?.handle ?? null, name })} · {card?.followerCount ?? 0} followers
            </p>
          </div>
        </div>
        <div className="mt-3 flex gap-2 px-4">
          <FollowButton creatorId={hostId} creatorName={name} size="md" className="flex-1 justify-center" />
          <button
            type="button"
            onClick={() => openDirectMessage(name)}
            className="inline-flex min-h-9 flex-1 items-center justify-center gap-1 rounded-full border border-border bg-surface-raised px-3 text-[0.7rem] font-extrabold uppercase tracking-wide text-foreground"
          >
            <MessageCircle className="size-3.5" /> Message
          </button>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
