import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, createFileRoute } from "@tanstack/react-router";
import { Compass, Map as MapIcon, Plus, Radio, Rows3 } from "lucide-react";
import { toast } from "sonner";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { ScrollableLane } from "@/components/ScrollableLane";

import { LoopingPreview, looksLikeVideo } from "@/components/LoopingPreview";
import { RecentCapturesFeed } from "@/components/RecentCapturesFeed";
import {
  CommunityFeedFilters,
  RADIUS_CHOICES,
  radiusMilesFor,
  type RadiusChoiceId,
} from "@/components/CommunityFeedFilters";
import { NewCommunityPostDialog } from "@/components/NewCommunityPostDialog";
import { GlobalFeedMap } from "@/components/GlobalFeedMap";
import { DiscoverStarterCards } from "@/components/DiscoverStarterCards";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import { distanceMiles, type MapPosition } from "@/lib/onlooker";
import {
  COMMUNITY_CATEGORIES,
  categoryDef,
  communityMediaUrls,
  isPinned,
  listCommunityPosts,
  type CommunityCategory,
  type CommunityPost,
} from "@/lib/community";
import { CategoryExampleCards } from "@/components/CategoryExampleCards";

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
          "A media-first local feed with verified creators, live streams and Credit tipping for everything happening around you.",
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
  const [radius, setRadius] = useState<RadiusChoiceId>("near");
  const [focus, setFocus] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const { area, busy: locationBusy, error: locationError, useMyLocation, setCity, applyPlace } = useDiscoveryArea();
  const center = useMemo<MapPosition>(() => ({ lat: area.latitude, lng: area.longitude }), [area]);

  const { unit, formatDistance } = useDistanceUnit(center);

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

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("onlooker_discover_radius");
      const savedChoice = RADIUS_CHOICES.find((choice) => choice.id === saved);
      if (savedChoice) {
        setRadius(savedChoice.id);
      }
    } catch {}
  }, []);

  const changeRadius = useCallback((id: RadiusChoiceId) => {
    setRadius(id);
    try {
      window.localStorage.setItem("onlooker_discover_radius", id);
    } catch {}
  }, []);

  const tagChoices = useMemo(() => {
    const source =
      category === "all"
        ? COMMUNITY_CATEGORIES.flatMap((c) => c.tags)
        : (COMMUNITY_CATEGORIES.find((c) => c.id === category)?.tags ?? []);
    return [...new Set(source)].slice(0, 14);
  }, [category]);

  const categoryPreviews = useMemo(() => {
    const previews: Partial<Record<CommunityCategory, string>> = {};
    [...posts]
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .forEach((post) => {
        const url = post.mediaPath ? media[post.mediaPath] : undefined;
        if (url && !previews[post.category] && looksLikeVideo(url)) previews[post.category] = url;
      });
    return previews;
  }, [media, posts]);

  const distanceFor = useCallback(
    (post: CommunityPost) => {
      if (post.latitude === null || post.longitude === null) return null;
      return distanceMiles(center, { lat: post.latitude, lng: post.longitude });
    },
    [center],
  );

  const label = useCallback((miles: number) => `${formatDistance(miles)} away`, [formatDistance]);

  /**
   * A tag behaves as a subcategory: match it against the post's own tags, its
   * lane tags and its words, so a chip like "language exchange" still finds
   * posts that only mention it in the title or body.
   */
  const matchesTag = useCallback((post: CommunityPost, wanted: string) => {
    const needle = wanted.trim().toLowerCase();
    if (!needle) return true;
    if (post.tags.some((t) => t.toLowerCase() === needle)) return true;
    const haystack = `${post.title} ${post.body} ${post.place} ${post.tags.join(" ")}`.toLowerCase();
    return haystack.includes(needle);
  }, []);

  const visible = useMemo(() => {
    const limit = radiusMilesFor(radius);
    const sort = (list: Array<{ post: CommunityPost; miles: number | null }>) =>
      [...list].sort((a, b) => {
        const pinDiff = Number(isPinned(b.post)) - Number(isPinned(a.post));
        if (pinDiff !== 0) return pinDiff;
        if (a.miles !== null && b.miles !== null) return a.miles - b.miles;
        if (a.miles !== null) return -1;
        if (b.miles !== null) return 1;
        return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
      });

    const inRange = posts
      .map((p) => ({ post: p, miles: distanceFor(p) }))
      .filter(({ miles }) => limit === null || (miles !== null && miles <= limit));

    const inLane = inRange.filter(({ post }) => category === "all" || post.category === category);
    const exact = tag ? inLane.filter(({ post }) => matchesTag(post, tag)) : inLane;

    // Subcategory pills are strict: never substitute sibling or unrelated posts.
    return sort(exact);
  }, [posts, category, tag, radius, distanceFor, matchesTag]);

  const featured = visible.filter((r) => isPinned(r.post));
  const rest = visible.filter((r) => !isPinned(r.post));

  const renderCard = ({ post, miles }: { post: CommunityPost; miles: number | null }) => (
    <CommunityPostCard
      key={post.id}
      post={post}
      {...(post.mediaPath && media[post.mediaPath] ? { mediaUrl: media[post.mediaPath] } : {})}
      {...(miles !== null ? { distanceLabel: label(miles) } : {})}
      isMine={post.userId === user?.id}
      onShowOnMap={() => {
        if (post.latitude === null || post.longitude === null) return;
        setFocus({ lat: post.latitude, lng: post.longitude, label: post.title });
        setView("map");
        window.scrollTo({ top: 0, behavior: "smooth" });
      }}
      onChanged={() => void load()}
    />
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
          A live local stream — tap a lane, tighten the radius, or open the map.
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
        <ScrollableLane
          className="-mx-5 sm:-mx-8"
          innerClassName="snap-x snap-mandatory gap-3 pl-5 pr-3 pb-2 [scroll-padding-left:1.25rem] sm:pl-8 sm:pr-6 sm:[scroll-padding-left:2rem]"
          ariaLabel="Category cards"
        >

          {COMMUNITY_CATEGORIES.map((c) => {
            const visual = COMMUNITY_VISUALS[c.id];
            const Icon = visual.icon;
            const previewUrl = categoryPreviews[c.id];
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => {
                  setCategory(c.id);
                  setTag(null);
                }}
                aria-pressed={category === c.id}
                className={`group relative h-32 min-w-[260px] shrink-0 snap-start overflow-hidden rounded-2xl border text-left transition-transform hover:-translate-y-0.5 motion-reduce:transition-none ${category === c.id ? "border-signal ring-2 ring-signal/30" : "border-border"}`}
              >
                <LoopingPreview
                  videoUrl={previewUrl}
                  imageUrl={previewUrl ? undefined : visual.image}
                  alt={previewUrl ? `Live preview for ${c.label}` : `${c.label} category`}
                  icon={Icon}
                  coverClass={visual.coverClass}
                />
                <span className="absolute inset-0 bg-gradient-to-t from-background via-background/20 to-transparent" />
                <span className="absolute inset-x-3 bottom-3 flex items-end gap-2 text-foreground">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-signal text-signal-foreground"><Icon className="size-4" /></span>
                  <span><strong className="block text-sm leading-tight">{c.label}</strong><small className="mt-0.5 line-clamp-1 block text-[0.65rem] text-foreground/75">{c.blurb}</small></span>
                </span>
              </button>
            );
          })}
        </ScrollableLane>

      </section>

      <ScrollableLane
        className="mt-2 -mx-5 sm:-mx-8"
        innerClassName="gap-1.5 px-5 pb-1 sm:px-8"
        ariaLabel="Subcategory filters"
        arrows={false}
        fade={false}
      >
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
      </ScrollableLane>


      <div className="mt-4 px-5 sm:px-8">
        <CommunityFeedFilters
          unit={unit}
          value={radius}
          onChange={changeRadius}
          areaLabel={area.label}
          locationBusy={locationBusy}
          locationError={locationError}
          onUseMyLocation={useMyLocation}
          onSearchArea={setCity}
          onApplyPlace={applyPlace}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
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
          <GlobalFeedMap focus={focus} />
        </div>
      ) : (
        <section className="mt-5 px-5 sm:px-8">
          {loading && <p className="text-sm text-muted-foreground">Loading Discover…</p>}
          {!loading && visible.length === 0 && category === "all" && radiusMilesFor(radius) !== null && (
            <div className="mb-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Nothing posted this close yet.
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => {
                  if (radius === "tight") {
                    changeRadius("near");
                  } else {
                    setLiveFirst(false);
                    setComposing(true);
                  }
                }}
                className="mt-4 rounded-full bg-signal px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-signal-foreground hover:bg-signal/90"
              >
                {radius === "tight" ? "Expand Radius to 5mi" : "Be the First to Post"}
              </Button>
            </div>
          )}
          {!loading && category !== "all" && visible.length === 0 && (
            <CategoryExampleCards
              category={category}
              tag={tag}
              onStart={(exampleCategory) => {
                setCategory(exampleCategory);
                setLiveFirst(false);
                setComposing(true);
              }}
            />
          )}
          {!loading && category === "all" && posts.length === 0 && (
            <DiscoverStarterCards
              onStart={(starterCategory) => {
                setCategory(starterCategory);
                setTag(null);
                setLiveFirst(false);
                setComposing(true);
              }}
            />
          )}
          {featured.map(renderCard)}
          <div className="columns-1 gap-4 [column-fill:_balance] sm:columns-2 lg:columns-3">
            {rest.map(renderCard)}
          </div>
          {/* Live activity is thin here — fall back to the evergreen clip archive. */}
          {!loading && visible.length < 3 && (
            <div className="mt-6">
              <RecentCapturesFeed
                title="Recent captures"
                blurb="Quiet nearby right now — here are streams that already wrapped."
              />
            </div>
          )}
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
