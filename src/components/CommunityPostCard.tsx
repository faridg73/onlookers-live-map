import { useEffect, useState } from "react";
import { BadgeCheck, Clock, MapPin, Pin, Radio, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ShareArtifactButton } from "@/components/ShareArtifactButton";
import { PayPerMinuteStream } from "@/components/PayPerMinuteStream";
import { TipCreditsButton } from "@/components/TipCreditsButton";
import { Button } from "@/components/ui/button";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import { fetchTrustStatsCached, type TrustStats } from "@/lib/trust";
import { formatCredits } from "@/lib/credits";
import {
  PIN_CREDIT_OPTIONS,
  categoryDef,
  deleteCommunityPost,
  isPinned,
  pinCommunityPost,
  timeLeftLabel,
  type CommunityPost,
} from "@/lib/community";

/** One media-rich Discover card: photo or gradient, countdown, boost, live view. */
export function CommunityPostCard({
  post,
  mediaUrl,
  isMine,
  onChanged,
}: {
  post: CommunityPost;
  mediaUrl?: string;
  isMine: boolean;
  onChanged: () => void;
}) {
  const [watching, setWatching] = useState(false);
  const [boosting, setBoosting] = useState(false);
  const [trust, setTrust] = useState<TrustStats | null>(null);
  const def = categoryDef(post.category);
  const visual = COMMUNITY_VISUALS[post.category];
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

  const left = timeLeftLabel(post.expiresAt);
  const pinned = isPinned(post);

  return (
    <article className="group overflow-hidden rounded-2xl border border-border bg-surface shadow-xl shadow-background/40">
      <div className={`relative w-full overflow-hidden ${post.aspect === "4:3" ? "aspect-[4/3]" : "aspect-video"} ${mediaUrl ? "" : visual.coverClass}`}>
        {mediaUrl && (
          <img
            src={mediaUrl}
            alt={`Photo shared with ${post.title}`}
            loading="lazy"
            className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
          />
        )}
        {!mediaUrl && (
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            <CategoryIcon className="size-20 text-foreground/20" strokeWidth={1.3} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-background/90 via-transparent to-background/35" />
        <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-foreground/15 bg-background/75 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.12em] text-foreground backdrop-blur-md">
          <CategoryIcon className="size-3.5 text-signal" /> {def.label}
        </span>
        {pinned && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md bg-signal px-2.5 py-1 text-[0.65rem] font-extrabold uppercase text-signal-foreground">
            <Pin className="size-3" /> Boosted
          </span>
        )}
        {!pinned && trust?.verified && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-md border border-foreground/15 bg-background/75 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase text-foreground backdrop-blur-md">
            <BadgeCheck className="size-3.5 text-signal" /> Verified local
          </span>
        )}
        {post.isFlash && left && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-signal px-2.5 py-1 text-[0.7rem] font-extrabold text-signal-foreground shadow-lg">
            <Clock className="size-3.5" /> Flash Meetup · {left}
          </span>
        )}
        {watching && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-live px-2.5 py-1 text-[0.7rem] font-extrabold text-background shadow-lg">
            <span className="size-1.5 animate-pulse rounded-full bg-background motion-reduce:animate-none" /> Live stream active
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="text-base font-extrabold text-foreground">{post.title}</h3>
        {post.body && <p className="mt-1 text-sm text-muted-foreground">{post.body}</p>}

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          {post.place && (
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {post.place}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            {post.authorName}
          </span>
          {trust && (
            <span className="inline-flex items-center gap-1 font-bold text-foreground">
              <Target className="size-3.5 text-signal" /> {trust.completionRate}% reputation
            </span>
          )}
        </div>

        {post.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {post.tags.map((t) => (
              <span
                key={t}
                className="rounded-full border border-border px-2 py-0.5 text-[0.68rem] text-muted-foreground"
              >
                #{t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {!isMine && (
            <Button
              type="button"
              onClick={() => setWatching((v) => !v)}
              size="sm"
              className="rounded-lg text-xs font-extrabold uppercase tracking-[0.12em]"
            >
              <Radio className="size-4" /> {watching ? "Hide" : "Watch live"}
            </Button>
          )}
          {!isMine && <TipCreditsButton receiverId={post.userId} receiverName={post.authorName} />}
          {isMine && (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setBoosting((v) => !v)}
                className="rounded-lg border-signal/60 bg-signal/10 text-xs font-bold uppercase tracking-[0.12em] text-signal"
              >
                <Pin className="size-4" /> Boost
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
                className="rounded-lg text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </Button>
            </>
          )}
          <ShareArtifactButton
            label="Card"
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
                  className="flex-1 rounded-lg border-signal/60 px-2 text-xs font-bold text-signal"
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
              postId={post.id}
              onClose={() => setWatching(false)}
            />
          </div>
        )}
      </div>
    </article>
  );
}
