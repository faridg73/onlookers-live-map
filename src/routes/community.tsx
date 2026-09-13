import { useCallback, useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Compass, Map as MapIcon, Plus, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { BottomNav } from "@/components/BottomNav";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { NewCommunityPostDialog } from "@/components/NewCommunityPostDialog";
import { GlobalFeedMap } from "@/components/GlobalFeedMap";
import { useAuth } from "@/hooks/use-auth";
import {
  COMMUNITY_CATEGORIES,
  communityMediaUrls,
  listCommunityPosts,
  type CommunityCategory,
  type CommunityPost,
} from "@/lib/community";

export const Route = createFileRoute("/community")({
  head: () => ({
    meta: [
      { title: "Discover — meetups, tutorials & language swaps | Onlooker Live" },
      {
        name: "description",
        content:
          "Find friends, join a flash meetup, learn something in ten minutes or swap languages with someone nearby — live on Onlooker.",
      },
      { property: "og:title", content: "Discover live community meetups on Onlooker" },
      {
        property: "og:description",
        content:
          "Community posts with live countdowns, pay-per-minute streams and tags for the things happening around you.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityHub,
});

function CommunityHub() {
  const { user } = useAuth();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<CommunityCategory | "all">("all");
  const [tag, setTag] = useState<string | null>(null);
  const [view, setView] = useState<"feed" | "map">("feed");
  const [composing, setComposing] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listCommunityPosts();
      setPosts(rows);
      setMedia(await communityMediaUrls(rows));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load Discover.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const tagChoices = useMemo(() => {
    const source =
      category === "all"
        ? COMMUNITY_CATEGORIES.flatMap((c) => c.tags)
        : (COMMUNITY_CATEGORIES.find((c) => c.id === category)?.tags ?? []);
    return [...new Set(source)].slice(0, 14);
  }, [category]);

  const visible = useMemo(
    () =>
      posts.filter(
        (p) =>
          (category === "all" || p.category === category) && (!tag || p.tags.includes(tag)),
      ),
    [posts, category, tag],
  );

  return (
    <main className="min-h-dvh bg-background pb-28">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)]">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-signal">
          <Compass className="size-4" /> Discover
        </p>
        <h1 className="mt-1 text-2xl font-extrabold text-foreground">
          People, meetups and live lessons near you
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a lane, filter by tag, or open the map to see what is happening right now.
        </p>
      </header>

      <div className="mt-5 flex gap-2 overflow-x-auto px-5 pb-1">
        <button
          type="button"
          onClick={() => {
            setCategory("all");
            setTag(null);
          }}
          className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
            category === "all"
              ? "border-signal bg-signal text-signal-foreground"
              : "border-border text-muted-foreground"
          }`}
        >
          Everything
        </button>
        {COMMUNITY_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategory(c.id);
              setTag(null);
            }}
            className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-bold ${
              category === c.id
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border text-muted-foreground"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 px-5">
        {tagChoices.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTag(tag === t ? null : t)}
            className={`rounded-full border px-2.5 py-1 text-[0.68rem] font-semibold ${
              tag === t ? "border-signal text-signal" : "border-border text-muted-foreground"
            }`}
          >
            #{t}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-center justify-between px-5">
        <div className="flex rounded-full border border-border p-0.5">
          <button
            type="button"
            onClick={() => setView("feed")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              view === "feed" ? "bg-signal text-signal-foreground" : "text-muted-foreground"
            }`}
          >
            <Rows3 className="size-3.5" /> Feed
          </button>
          <button
            type="button"
            onClick={() => setView("map")}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${
              view === "map" ? "bg-signal text-signal-foreground" : "text-muted-foreground"
            }`}
          >
            <MapIcon className="size-3.5" /> Map
          </button>
        </div>
        <button
          type="button"
          onClick={() => setComposing(true)}
          className="inline-flex items-center gap-1.5 rounded-full bg-signal px-4 py-2 text-xs font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
        >
          <Plus className="size-4" /> Post
        </button>
      </div>

      {view === "map" ? (
        <div className="mt-4 px-5">
          <GlobalFeedMap />
        </div>
      ) : (
        <section className="mt-4 space-y-4 px-5">
          {loading && <p className="text-sm text-muted-foreground">Loading Discover…</p>}
          {!loading && visible.length === 0 && (
            <div className="rounded-3xl border border-dashed border-border p-6 text-center">
              <p className="text-sm font-bold text-foreground">Nothing here yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Be first — post a walk, a lesson or a flash meetup and it shows up instantly.
              </p>
            </div>
          )}
          {visible.map((post) => (
            <CommunityPostCard
              key={post.id}
              post={post}
              {...(post.mediaPath && media[post.mediaPath]
                ? { mediaUrl: media[post.mediaPath] }
                : {})}
              isMine={post.userId === user?.id}
              onChanged={() => void load()}
            />
          ))}
        </section>
      )}

      <NewCommunityPostDialog
        open={composing}
        onOpenChange={setComposing}
        onPosted={() => void load()}
        {...(category !== "all" ? { initialCategory: category } : {})}
      />

      <BottomNav />
    </main>
  );
}
