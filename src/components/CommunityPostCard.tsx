import { useState } from "react";
import { Clock, MapPin, Pin, Radio, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ShareArtifactButton } from "@/components/ShareArtifactButton";
import { PayPerMinuteStream } from "@/components/PayPerMinuteStream";
import { HunterBadge } from "@/components/HunterBadge";
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
  const def = categoryDef(post.category);
  const left = timeLeftLabel(post.expiresAt);
  const pinned = isPinned(post);

  return (
    <article className="overflow-hidden rounded-3xl border border-border bg-surface">
      <div
        className={`relative w-full ${post.aspect === "4:3" ? "aspect-[4/3]" : "aspect-video"}`}
        style={mediaUrl ? undefined : { background: def.gradient }}
      >
        {mediaUrl && (
          <img
            src={mediaUrl}
            alt={`Photo shared with ${post.title}`}
            loading="lazy"
            className="size-full object-cover"
          />
        )}
        <span className="absolute left-3 top-3 rounded-full bg-black/70 px-2.5 py-1 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-signal">
          {def.label}
        </span>
        {pinned && (
          <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-signal px-2.5 py-1 text-[0.65rem] font-extrabold uppercase text-signal-foreground">
            <Pin className="size-3" /> Boosted
          </span>
        )}
        {post.isFlash && left && (
          <span className="absolute bottom-3 left-3 inline-flex items-center gap-1 rounded-full bg-black/75 px-2.5 py-1 text-[0.7rem] font-extrabold text-signal">
            <Clock className="size-3.5" /> {left}
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
            <HunterBadge level={post.hunterLevel} />
          </span>
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
            <button
              type="button"
              onClick={() => setWatching((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-signal px-3 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
            >
              <Radio className="size-4" /> {watching ? "Hide" : "Watch live"}
            </button>
          )}
          {isMine && (
            <>
              <button
                type="button"
                onClick={() => setBoosting((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-signal/60 bg-signal/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-signal"
              >
                <Pin className="size-4" /> Boost
              </button>
              <button
                type="button"
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
                className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground"
              >
                <Trash2 className="size-4" />
              </button>
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
                <button
                  key={c}
                  type="button"
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
                  className="flex-1 rounded-xl border border-signal/60 px-2 py-2 text-xs font-bold text-signal"
                >
                  {formatCredits(c)}
                </button>
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
