// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck, CalendarDays, Clock, Flag, MapPin, Navigation, Pin, Radio, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ShareArtifactButton } from "@/components/ShareArtifactButton";
import { ShareToSocialButton } from "@/components/ShareToSocialButton";
import { LoopingPreview, looksLikeVideo } from "@/components/LoopingPreview";
import { PayPerMinuteStream } from "@/components/PayPerMinuteStream";
import { TipCreditsButton } from "@/components/TipCreditsButton";
import { HunterBadge } from "@/components/HunterBadge";
import { MembershipBadge } from "@/components/MembershipBadge";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { FollowButton } from "@/components/FollowButton";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import { fetchTrustStatsCached, type TrustStats } from "@/lib/trust";
import { formatCredits } from "@/lib/credits";
import { awardReputation } from "@/lib/reputation";
import { fetchMyTrustLevel, type TrustLevel } from "@/lib/trust-tiers";
import {
  PIN_CREDIT_OPTIONS,
  categoryDef,
  deleteCommunityPost,
  isPinned,
  pinCommunityPost,
  timeLeftLabel,
  type CommunityPost,
  voteOnCommunityReport,
} from "@/lib/community";

/** One media-rich Discover card: photo or gradient, author identity, quick actions. */
export function CommunityPostCard({
  post,
  mediaUrl,
  isMine,
  distanceLabel,
  onShowOnMap,
  onTagClick,
  onChanged,
}: {
  post: CommunityPost;
  mediaUrl?: string;
  isMine: boolean;
  distanceLabel?: string;
  onShowOnMap?: () => void;
  /** Opens the map filtered to that hashtag, same as picking a vibe. */
  onTagClick?: (tag: string) => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const [watching, setWatching] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [trust, setTrust] = useState<TrustStats | null>(null);
  const [voting, setVoting] = useState<"validate" | "flag" | null>(null);
  const [viewerTrustLevel, setViewerTrustLevel] = useState<TrustLevel>(1);
  const def = categoryDef(post.category);
  // Older rows can carry a lane that no longer exists, so fall back instead of crashing.
  const visual = COMMUNITY_VISUALS[post.category] ?? COMMUNITY_VISUALS.general;
  const CategoryIcon = visual.icon;

  useEffect(() => {
    let alive = true;
    void fetchTrustStatsCached(post.userId).then((s) => {
      if (alive) setTrust(s);
    });
    return () => {
      alive = false;
    };
  }, [post.userId]);

  useEffect(() => {
    if (!user) {
      setViewerTrustLevel(1);
      return;
    }
    void fetchMyTrustLevel().then(setViewerTrustLevel);
  }, [user]);

  const left = timeLeftLabel(post.expiresAt);
  const pinned = isPinned(post);
  const isReport = Boolean(post.reportIncidentType);
  const reportStatus = post.reportStatus ?? "unverified";
  const reportStatusClass = reportStatus === "confirmed"
    ? "border-signal/60 bg-signal/10 text-signal"
    : reportStatus === "disputed"
      ? "border-crisis/60 bg-crisis/10 text-crisis"
      : "border-border bg-surface-raised text-muted-foreground";
  const initial = post.authorName.trim().charAt(0).toUpperCase() || "O";
  const handle = `@${post.authorName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "onlooker"}`;

  async function vote(voteType: "validate" | "flag") {
    setVoting(voteType);
    try {
      await voteOnCommunityReport(post.id, voteType);
      await awardReputation(voteType === "validate" ? "validate_marker" : "flag_outdated", post.id);
      toast.success(voteType === "validate" ? "Report validated." : "Report flagged for review.");
      onChanged();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't record your response.");
    } finally {
      setVoting(null);
    }
  }

  return (
    <article className="group overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 shadow-lg shadow-background/40 backdrop-blur-md">
      <div className={`relative w-full overflow-hidden ${post.aspect === "4:3" ? "aspect-[4/3]" : "aspect-video"}`}>
        <LoopingPreview
          {...(looksLikeVideo(mediaUrl) ? { videoUrl: mediaUrl } : { imageUrl: mediaUrl })}
          alt={`Media shared with ${post.title}`}
          icon={CategoryIcon}
          coverClass={visual.coverClass}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/35" />
        <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-md border border-foreground/15 bg-background/75 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-foreground backdrop-blur-md">
          <CategoryIcon className="size-3 text-muted-foreground" /> {def.label}
        </span>
        {pinned && (
          <span className="absolute right-2.5 top-2.5 inline-flex items-center gap-1 rounded-md bg-signal px-2 py-0.5 text-[0.6rem] font-extrabold uppercase text-signal-foreground">
            <Pin className="size-3" /> Boosted
          </span>
        )}
        {post.isFlash && left && (
          <span className="absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-md bg-signal px-2 py-0.5 text-[0.65rem] font-extrabold text-signal-foreground shadow-lg">
            <Clock className="size-3" /> {left}
          </span>
        )}
        {watching && (
          <span className="absolute bottom-2.5 right-2.5 inline-flex items-center gap-1 rounded-md bg-live px-2 py-0.5 text-[0.65rem] font-extrabold text-background shadow-lg">
            <span className="size-1.5 animate-pulse rounded-full bg-background motion-reduce:animate-none" /> Live
          </span>
        )}
      </div>

      <div className="p-3.5">
        <div className="flex items-center gap-2">
          {post.authorAvatar ? (
            <img
              src={post.authorAvatar}
              alt={`${post.authorName} profile photo`}
              loading="lazy"
              className="size-8 shrink-0 rounded-full border border-border object-cover"
            />
          ) : (
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface-raised text-xs font-extrabold text-muted-foreground">
              {initial}
            </span>
          )}
          <span className="min-w-0">
            <span className="flex items-center gap-1 text-xs font-extrabold text-foreground">
              <span className="truncate">{post.authorName}</span>
              {post.authorVerified && <VerifiedBadge className="size-3.5" />}
              <MembershipBadge userId={post.userId} />
            </span>
            <span className="block truncate text-[0.65rem] text-muted-foreground">{handle}</span>
          </span>
          <HunterBadge level={post.hunterLevel} showLevel={false} className="ml-auto shrink-0" />
          {!isMine && <FollowButton creatorId={post.userId} creatorName={post.authorName} />}
        </div>

        <h3 className="mt-2.5 text-sm font-extrabold leading-snug text-foreground">{post.title}</h3>
        {post.body && <p className="mt-1 line-clamp-2 text-xs font-semibold text-muted-foreground">{post.body}</p>}
        {isReport && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[0.62rem] font-extrabold uppercase ${reportStatusClass}`}>
              {reportStatus === "confirmed" ? <BadgeCheck className="size-3" /> : reportStatus === "disputed" ? <AlertTriangle className="size-3" /> : <ShieldCheck className="size-3" />}
              {reportStatus}
            </span>
            <span className="text-[0.65rem] font-bold text-muted-foreground">
              Trust {post.trustScore} · {post.validationCount} validations · {post.flagCount} flags
            </span>
            {post.mediaAnalysisStatus !== "not_required" && (
              <span className="text-[0.65rem] font-bold text-muted-foreground">
                {post.mediaAnalysisStatus === "analyzing" ? "Analyzing media" : "Media analysis complete"}
              </span>
            )}
          </div>
        )}

        {post.eventStartsAt && (
          <p className="mt-2 inline-flex items-center gap-1 rounded-md border border-border bg-surface-raised px-2 py-1 text-[0.65rem] font-extrabold text-muted-foreground">
            <CalendarDays className="size-3" />
            {new Date(post.eventStartsAt).toLocaleString(undefined, {
              weekday: "short",
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}

        <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[0.68rem] text-muted-foreground">
          {post.place && (
            <span className="inline-flex min-w-0 items-center gap-1">
              <MapPin className="size-3" /> <span className="truncate">{post.place}</span>
            </span>
          )}
          {distanceLabel && <span className="font-bold text-muted-foreground">{distanceLabel}</span>}
          {trust && trust.totalClaims > 0 && (
            <span className="font-bold text-foreground">{trust.completionRate}% rep</span>
          )}
        </div>

        {post.tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map((t) =>
              onTagClick ? (
                <button
                  key={t}
                  type="button"
                  onClick={() => onTagClick(t)}
                  title={`Open the map filtered to #${t}`}
                  className="rounded-full border border-white/15 px-2 py-0.5 text-[0.62rem] font-bold text-muted-foreground transition-colors hover:border-white/30 hover:text-foreground"
                >
                  #{t}
                </button>
              ) : (
                <span
                  key={t}
                  className="rounded-full border border-white/15 px-2 py-0.5 text-[0.62rem] font-bold text-muted-foreground"
                >
                  #{t}
                </span>
              ),
            )}
          </div>
        )}

        <div className="mt-3 flex flex-wrap gap-1.5">
          {onShowOnMap && post.latitude !== null && post.longitude !== null && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onShowOnMap}
              className="h-8 rounded-lg px-2.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground"
            >
              <Navigation className="size-3.5" /> Map pin
            </Button>
          )}
          {!isMine && (
            <Button
              type="button"
              onClick={() => setWatching((v) => !v)}
              size="sm"
              className="h-8 rounded-lg px-2.5 text-[0.65rem] font-extrabold uppercase tracking-[0.08em]"
            >
              <Radio className="size-3.5" /> {watching ? "Hide" : "Join live"}
            </Button>
          )}
          {!isMine && <TipCreditsButton receiverId={post.userId} receiverName={post.authorName} />}
          {!isMine && isReport && reportStatus !== "expired" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={voting !== null || !user || viewerTrustLevel < 2}
                title={viewerTrustLevel < 2 ? "Validation requires a Level 2 or Level 3 account" : "Validate this report"}
                onClick={() => void vote("validate")}
                className="h-8 rounded-lg px-2.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground"
              >
                <BadgeCheck className="size-3.5" /> Validate
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={voting !== null || !user}
                onClick={() => void vote("flag")}
                className="h-8 rounded-lg px-2.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground"
              >
                <Flag className="size-3.5" /> Flag
              </Button>
            </>
          )}
          {isMine && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBoosting((v) => !v)}
                className="h-8 rounded-lg px-2.5 text-[0.65rem] font-bold uppercase tracking-[0.08em] text-muted-foreground"
              >
                <Pin className="size-3.5" /> Boost
              </Button>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Delete post"
                onClick={() => {
                  void deleteCommunityPost(post.id)
                    .then(() => {
                      toast.success("Post removed.");
                      onChanged();
                    })
                    .catch((err: unknown) =>
                      toast.error(err instanceof Error ? err.message : "Couldn't remove that."),
                    );
                }}
                className="size-8 rounded-lg text-muted-foreground"
              >
                <Trash2 className="size-3.5" />
              </Button>
            </>
          )}
          <ShareToSocialButton
            subject={{
              kind: "live",
              id: post.id,
              title: post.title,
              place: post.place,
              latitude: post.latitude,
              longitude: post.longitude,
            }}
            label="Social"
            className="h-8 px-2.5 py-0 text-[0.65rem]"
          />
          <ShareArtifactButton
            artifact={{
              kind: post.isFlash ? "meetup" : "discovery",
              title: post.title,
              place: post.place,
              note: def.label,
              ...(mediaUrl ? { imageUrl: mediaUrl } : {}),
            }}
          />
        </div>

        {boosting && (
          <div className="mt-3 rounded-2xl border border-border bg-surface-raised p-3">
            <p className="text-xs text-muted-foreground">
              Pin this to the top of Discover for 6 hours.
            </p>
            <div className="mt-2 flex gap-2">
              {PIN_CREDIT_OPTIONS.map((c) => (
                <Button
                  key={c}
                  type="button"
                  variant="outline"
                  onClick={() => {
                    void pinCommunityPost(post.id, c)
                      .then(() => {
                        toast.success(`Boosted for ${formatCredits(c)}.`);
                        setBoosting(false);
                        onChanged();
                      })
                      .catch((err: unknown) =>
                        toast.error(err instanceof Error ? err.message : "Couldn't boost that."),
                      );
                  }}
                  className="flex-1 rounded-lg px-2 text-xs font-bold text-foreground"
                >
                  {formatCredits(c)}
                </Button>
              ))}
            </div>
          </div>
        )}

        {watching && (
          <div className="mt-3">
            <PayPerMinuteStream
              hostId={post.userId}
              hostName={post.authorName}
              hostVerified={post.authorVerified}
              postId={post.id}
              onClose={() => setWatching(false)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
