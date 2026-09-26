// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ImageOff, MapPin, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { BROADCAST_CATEGORIES } from "@/lib/broadcast-categories";
import { STARTER_VIBE_PHOTOS } from "@/lib/starter-vibe-photos";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import {
  communityMediaUrls,
  deleteCommunityPost,
  isPostLive,
  listMyCommunityPosts,
  type CommunityPost,
} from "@/lib/community";

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Profile: everything this member has posted across every vibe, newest first. */
export function MyCommunityPosts() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!user) {
      setPosts([]);
      return;
    }
    void listMyCommunityPosts()
      .then(async (rows) => {
        setPosts(rows);
        const urls = await communityMediaUrls(rows).catch(() => ({}));
        setMedia(urls);
      })
      .catch(() => setPosts([]));
  }, [user?.id]);

  useEffect(load, [load]);

  async function remove(post: CommunityPost) {
    if (!window.confirm(`Delete “${post.title}”? This cannot be undone.`)) return;
    setBusy(post.id);
    try {
      await deleteCommunityPost(post.id);
      setPosts((prev) => (prev ?? []).filter((p) => p.id !== post.id));
      toast.success("Post deleted.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete that post.");
    } finally {
      setBusy(null);
    }
  }

  if (!user) return null;

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-display text-lg text-foreground">My posts</h2>
        {posts && posts.length > 0 && (
          <span className="text-xs text-muted-foreground">{posts.length} total</span>
        )}
      </div>

      {posts === null ? (
        <p className="mt-3 rounded-2xl border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
          Loading your posts…
        </p>
      ) : posts.length === 0 ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          You haven&apos;t posted to Discover yet.
          <Link to="/community" className="mt-2 block font-semibold text-signal hover:underline">
            Pick a vibe and post something
          </Link>
        </div>
      ) : (
        <ul className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {posts.map((post) => {
            const vibe = BROADCAST_CATEGORIES.find((c) =>
              post.tags.some((t) => t.toLowerCase() === c.id),
            );
            const img =
              (post.mediaPath && media[post.mediaPath]) ||
              (vibe && STARTER_VIBE_PHOTOS[vibe.id]?.[0]?.src) ||
              COMMUNITY_VISUALS[post.category]?.image;
            const expired = !isPostLive(post);
            return (
              <li
                key={post.id}
                className="flex gap-3 rounded-2xl border border-border bg-surface p-3"
              >
                <span className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-surface-raised">
                  {img ? (
                    <img src={img} alt="" className="size-full object-cover" loading="lazy" />
                  ) : (
                    <ImageOff className="absolute inset-0 m-auto size-5 text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <Link
                    to="/community"
                    search={vibe ? { cat: vibe.id } : {}}
                    className="text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-signal hover:underline"
                  >
                    {vibe ? `${vibe.icon} ${vibe.label}` : "Discover"}
                  </Link>
                  <p className="mt-0.5 line-clamp-2 text-sm font-semibold text-foreground">
                    {post.title}
                  </p>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {post.place || "No location"} · {ago(post.createdAt)}
                    </span>
                  </p>
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    {expired && (
                      <span className="rounded-md bg-surface-raised px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase text-muted-foreground">
                        Expired
                      </span>
                    )}
                    {post.hiddenAt && (
                      <span className="rounded-md bg-destructive/15 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase text-destructive">
                        Under review
                      </span>
                    )}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void remove(post)}
                  disabled={busy === post.id}
                  aria-label={`Delete ${post.title}`}
                  className="size-8 shrink-0 self-start rounded-full border border-border text-muted-foreground transition-colors hover:border-destructive hover:text-destructive disabled:opacity-50"
                >
                  <Trash2 className="mx-auto size-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
