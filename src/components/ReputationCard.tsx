// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, MessageCircle, ShieldCheck, Star } from "lucide-react";
import { FollowButton } from "@/components/FollowButton";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { useAuth } from "@/hooks/use-auth";
import { fetchReputationCard, openDirectMessage, type ReputationCard as Card } from "@/lib/reputation-cards";
import { cn } from "@/lib/utils";

/** Inline hunter/pro reputation shown wherever that person appears in marketplace lists. */
export function ReputationCard({
  userId,
  fallbackName,
  fallbackAvatar = null,
  leading,
  trailing,
  className,
}: {
  userId: string;
  fallbackName: string;
  fallbackAvatar?: string | null;
  leading?: ReactNode;
  trailing?: ReactNode;
  className?: string;
}) {
  const { user } = useAuth();
  const [card, setCard] = useState<Card | null>(null);
  useEffect(() => {
    let alive = true;
    void fetchReputationCard(userId).then((c) => alive && setCard(c));
    return () => {
      alive = false;
    };
  }, [userId]);

  const name = card?.name ?? fallbackName;
  const avatar = card?.avatarUrl ?? fallbackAvatar;
  const isSelf = user?.id === userId;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      {leading}
      {avatar ? (
        <img src={avatar} alt={`${name} avatar`} loading="lazy" className="size-10 shrink-0 rounded-full object-cover" />
      ) : (
        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-surface-raised font-display text-sm text-foreground">
          {name.slice(0, 2).toUpperCase()}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1 truncate text-sm font-bold text-foreground">
          <span className="truncate">{name}</span>
          {card?.verified && <VerifiedBadge className="size-3.5" />}
        </p>
        <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-0.5">
            <Star className="size-3 fill-signal text-signal" />
            {card && card.reviewCount > 0 ? `${card.rating.toFixed(1)} (${card.reviewCount})` : "No reviews"}
          </span>
          <span>{card?.bountiesCompleted ?? 0} completed</span>
          <span>{card?.onTimeRate ?? 0}% on time</span>
          <span>{card?.followerCount ?? 0} followers</span>
        </p>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[0.6rem] font-bold uppercase tracking-[0.08em]">
          <span className="inline-flex items-center gap-0.5 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
            <ShieldCheck className="size-3 text-signal" /> Escrow-backed
          </span>
          {card?.idConfirmed && (
            <span className="inline-flex items-center gap-0.5 rounded-full border border-border px-2 py-0.5 text-muted-foreground">
              <BadgeCheck className="size-3 text-signal" /> ID-confirmed
            </span>
          )}
        </div>
        {!isSelf && (
          <div className="mt-1.5 flex gap-1.5">
            <FollowButton creatorId={userId} creatorName={name} />
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openDirectMessage(name);
              }}
              className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border bg-surface-raised px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-wide text-foreground"
            >
              <MessageCircle className="size-3" /> Message
            </button>
          </div>
        )}
      </div>
      {trailing}
    </div>
  );
}
