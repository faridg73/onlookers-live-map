import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Compass, Map as MapIcon, Plus, Radio, Rows3, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { NewCommunityPostDialog } from "@/components/NewCommunityPostDialog";
import { GlobalFeedMap } from "@/components/GlobalFeedMap";
import { DiscoverStarterCards } from "@/components/DiscoverStarterCards";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
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
  const [liveFirst, setLiveFirst] = useState(false);
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
      <div className="mx-auto w-full max-w-5xl">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8">
        <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-signal">
          <Compass className="size-4" /> Discover
        </p>
        <h1 className="mt-2 max-w-2xl text-3xl font-extrabold text-foreground sm:text-4xl">
          See what your city is doing now
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap a lane, filter by tag, or open the map to see what is happening right now.
        </p>
        <Link
          to="/discover"
          className="mt-2 inline-block text-xs font-bold uppercase tracking-[0.14em] text-signal"
        >
          Browse venues & events →
        </Link>
      </header>

      <section aria-label="Discover categories" className="mt-6">
        <div className="mb-3 flex items-center justify-between px-5 sm:px-8">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-foreground">Explore by vibe</h2>
          <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            setCategory("all");
            setTag(null);
          }}
          className={category === "all" ? "text-signal" : "text-muted-foreground"}
        >
          Everything
        </Button>
        </div>
        <div className="flex snap-x snap-mandatory gap-3 overflow-x-auto px-5 pb-2 sm:px-8">
        {COMMUNITY_CATEGORIES.map((c) => {
          const visual = COMMUNITY_VISUALS[c.id];
          const Icon = visual.icon;
          return (
          <button
            key={c.id}
            type="button"
            onClick={() => {
              setCategory(c.id);
              setTag(null);
            }}
            aria-pressed={category === c.id}
            className={`group relative h-32 w-48 shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 motion-reduce:transition-none ${category === c.id ? "border-signal ring-2 ring-signal/30" : "border-border"}`}
          >
            <img src={visual.image} alt="" width={1024} height={640} loading="lazy" className="size-full object-cover transition-transform duration-500 group-hover:scale-105 motion-reduce:transition-none" />
            <span className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
            <span className="absolute inset-x-3 bottom-3 flex items-end gap-2 text-foreground">
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-signal text-signal-foreground"><Icon className="size-4" /></span>
              <span><strong className="block text-sm leading-tight">{c.label}</strong><small className="mt-0.5 line-clamp-1 block text-[0.65rem] text-foreground/75">{c.blurb}</small></span>
            </span>
          </button>
        )})}
        </div>
      </section>

      <div className="mt-2 flex gap-1.5 overflow-x-auto px-5 pb-1 sm:px-8">
        {tagChoices.map((t) => (
          <Button
            key={t}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setTag(tag === t ? null : t)}
            className={`h-7 shrink-0 rounded-full px-2.5 text-[0.68rem] font-semibold ${
              tag === t ? "border-signal bg-signal/10 text-signal" : "text-muted-foreground"
            }`}
          >
            #{t}
          </Button>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
        <div className="flex rounded-full border border-border p-0.5">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("feed")}
            className={`rounded-full text-xs font-bold ${
              view === "feed" ? "bg-signal text-signal-foreground" : "text-muted-foreground"
            }`}
          >
            <Rows3 className="size-3.5" /> Feed
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setView("map")}
            className={`rounded-full text-xs font-bold ${
              view === "map" ? "bg-signal text-signal-foreground" : "text-muted-foreground"
            }`}
          >
            <MapIcon className="size-3.5" /> Map
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLiveFirst(true);
              setComposing(true);
            }}
            className="rounded-full border-signal/60 bg-signal/10 text-xs font-extrabold uppercase tracking-[0.1em] text-signal"
          >
            <Radio className="size-4" /> Start live stream
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setLiveFirst(false);
              setComposing(true);
            }}
            className="rounded-full px-4 text-xs font-extrabold uppercase tracking-[0.1em]"
          >
            <Plus className="size-4" /> Post
          </Button>
        </div>
      </div>

      {view === "map" ? (
        <div className="mt-5 px-5 sm:px-8">
          <GlobalFeedMap />
        </div>
      ) : (
        <section className="mt-5 space-y-5 px-5 sm:px-8">
          {loading && <p className="text-sm text-muted-foreground">Loading Discover…</p>}
          {!loading && visible.length === 0 && (
            <DiscoverStarterCards
              onStart={(starterCategory) => {
                setCategory(starterCategory);
                setTag(null);
                setLiveFirst(false);
                setComposing(true);
              }}
            />
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
        initialCamera={liveFirst}
        {...(category !== "all" ? { initialCategory: category } : {})}
      />
      </div>

    </main>
  );
}
