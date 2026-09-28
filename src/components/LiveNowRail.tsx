// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { MapPin, Radio } from "lucide-react";
import { PostSafetyMenu } from "@/components/PostSafetyMenu";
import { useAuth } from "@/hooks/use-auth";
import { isPostLive, type CommunityPost } from "@/lib/community";

/** Active free live streams, tagged "free broadcast" and not yet expired. */
export function liveStreamsFrom(posts: CommunityPost[]) {
  return posts
    .filter((p) => p.isFlash && p.tags.includes("free broadcast") && p.expiresAt && isPostLive(p))
    .filter((p) => !p.tags.includes("audience:private"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** "Live now" rail pinned near the top of the feed so streams aren't buried. */
export function LiveNowRail({
  posts,
  onOpen,
  onChanged,
}: {
  posts: CommunityPost[];
  onOpen: (post: CommunityPost) => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const live = liveStreamsFrom(posts);
  if (live.length === 0) return null;
  return (
    <section aria-label="Live now" className="mt-5 px-5 sm:px-8">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-destructive" />
        </span>
        Live now · {live.length}
      </p>
      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {live.map((post) => (
          <div
            key={post.id}
            className="relative w-60 shrink-0 snap-start rounded-2xl border border-signal/40 bg-card p-3"
          >
            <button type="button" onClick={() => onOpen(post)} className="block w-full text-left">
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-destructive-foreground">
                <Radio className="size-3" /> Live
              </span>
              <p className="mt-2 line-clamp-2 text-sm font-bold text-foreground">{post.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">@{post.authorName}</p>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-signal">
                <MapPin className="size-3 shrink-0" /> {post.place}
              </p>
            </button>
            {user?.id !== post.userId ? (
              <div className="absolute right-2 top-2">
                <PostSafetyMenu
                  postId={post.id}
                  authorId={post.userId}
                  authorName={post.authorName}
                  onChanged={onChanged}
                />
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}
