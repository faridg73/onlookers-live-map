// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Link } from "@tanstack/react-router";
import { Clock, MapPin, Radio } from "lucide-react";
import type { LiveRequest } from "@/lib/onlooker";
import { PostSafetyMenu } from "@/components/PostSafetyMenu";
import { useAuth } from "@/hooks/use-auth";
import { isActivelyStreaming, type CommunityPost } from "@/lib/community";

/** Active free live streams, tagged "free broadcast" and not yet expired. */
export function liveStreamsFrom(posts: CommunityPost[]) {
  return posts
    .filter((p) => isActivelyStreaming(p))
    .filter((p) => !p.tags.includes("audience:private"))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

/** "Live now" rail pinned near the top of the feed so streams aren't buried. */
export function LiveNowRail({
  posts,
  requests = [],
  onOpen,
  onChanged,
}: {
  posts: CommunityPost[];
  /** Open, unclaimed bounty requests, shown in their own section. */
  requests?: LiveRequest[];
  onOpen: (post: CommunityPost) => void;
  onChanged: () => void;
}) {
  const { user } = useAuth();
  const live = liveStreamsFrom(posts);
  const open = requests.filter((r) => r.status === "open" && (r.expiresAt ?? 0) > Date.now());
  if (live.length === 0 && open.length === 0) return null;
  return (
    <>
    {live.length > 0 && (
    <section aria-label="Filming now" className="mt-5 px-5 sm:px-8">
      <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.18em] text-foreground">
        <span className="relative flex size-2">
          <span className="absolute inline-flex size-full animate-ping rounded-full bg-destructive opacity-75" />
          <span className="relative inline-flex size-2 rounded-full bg-destructive" />
        </span>
        Filming now · {live.length}
      </p>
      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
        {live.map((post) => (
          <div
            key={post.id}
            className="relative w-60 shrink-0 snap-start rounded-2xl border border-signal/40 bg-card p-3"
          >
            <Link
              to="/live/$id"
              params={{ id: post.id }}
              search={{ title: post.title, place: post.place, ...(post.latitude != null && post.longitude != null ? { lat: post.latitude, lng: post.longitude } : {}) }}
              onClick={() => onOpen(post)}
              className="block w-full text-left active:opacity-80"
            >
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-destructive-foreground">
                <Radio className="size-3" /> Live
              </span>
              <p className="mt-2 line-clamp-2 text-sm font-bold text-foreground">{post.title}</p>
              <p className="mt-1 truncate text-xs text-muted-foreground">@{post.authorName}</p>
              <p className="mt-1 flex items-center gap-1 truncate text-xs text-signal">
                <MapPin className="size-3 shrink-0" /> {post.place}
              </p>
            </Link>
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
    )}
    {open.length > 0 && (
      <section aria-label="Open requests" className="mt-5 px-5 sm:px-8">
        <p className="text-xs font-extrabold uppercase tracking-[0.18em] text-foreground">
          Open requests · {open.length}
        </p>
        <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2">
          {open.map((r) => {
            const mins = Math.max(0, Math.round(((r.expiresAt ?? 0) - Date.now()) / 60_000));
            return (
              <Link
                key={r.id}
                to="/b/$id"
                params={{ id: r.dbId ?? r.id }}
                className="block w-60 shrink-0 snap-start rounded-2xl border border-border bg-card p-3 text-left transition-colors hover:border-signal/60 active:scale-[0.99]"
              >
                <span className="inline-flex items-center gap-1 rounded-full border border-signal/50 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-signal">
                  Open · waiting for an onlooker
                </span>
                <p className="mt-2 line-clamp-2 text-sm font-bold text-foreground">{r.title}</p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                  <Clock className="size-3 shrink-0" /> {mins >= 60 ? `${Math.floor(mins / 60)}h ${mins % 60}m` : `${mins} min`} left · {Math.round(r.bounty)} Credits
                </p>
                <p className="mt-1 flex items-center gap-1 truncate text-xs text-signal">
                  <MapPin className="size-3 shrink-0" /> {r.place}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    )}
    </>
  );
}
