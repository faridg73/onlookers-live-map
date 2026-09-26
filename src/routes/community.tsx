// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, createFileRoute, useCanGoBack, useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, CalendarPlus, Check, Compass, Filter, Map as MapIcon, Plus, Radio, Rows3, Siren, UserCheck, X } from "lucide-react";
import { NewLocalEventDialog } from "@/components/NewLocalEventDialog";
import { CommunityPostCard } from "@/components/CommunityPostCard";
import { BroadcastCategoryPicker } from "@/components/BroadcastCategoryPicker";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/use-auth";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { FOLLOWS_CHANGED_EVENT, listFollowedCreatorIds } from "@/lib/follows";
import { useSessionScroll } from "@/hooks/use-session-scroll";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import { BROADCAST_CATEGORY_ART } from "@/lib/category-art";
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
import { useOnlooker } from "@/lib/onlooker-store";
import { RouteErrorPanel, SectionBoundary } from "@/components/SectionBoundary";
import { readSessionState, writeSessionState } from "@/lib/session-state";
import {
  BROADCAST_CATEGORIES,
  broadcastCategoryById,
  type BroadcastCategoryId,
} from "@/lib/broadcast-categories";
import {
  STRANGE_SIGHTINGS_ID,
  STRANGE_SIGHTINGS_LABEL,
  matchesStrangeSighting,
} from "@/lib/strange-sightings";

export const Route = createFileRoute("/community")({
  validateSearch: (search: Record<string, unknown>): { mystery?: "report" | "logs"; cat?: string } => ({
    ...(search["mystery"] === "report" || search["mystery"] === "logs"
      ? { mystery: search["mystery"] }
      : {}),
    ...(typeof search["cat"] === "string" ? { cat: search["cat"] } : {}),
  }),
  head: () => ({
    meta: [
      { title: "Community feed and local activity | Onlooker" },
      {
        name: "description",
        content:
          "Help with real-world requests, complete verified captures, and earn through transparent bounties backed by locked credits.",
      },
      { property: "og:title", content: "Community feed and local activity | Onlooker" },
      {
        property: "og:description",
        content:
          "Help with real requests, complete verified captures, and earn through bounties backed by locked credits.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CommunityHub,
  errorComponent: RouteErrorPanel,
});

function CommunityHub() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const navigate = useNavigate();
  const { mystery, cat } = Route.useSearch();
  const { user } = useAuth();
  const { requests } = useOnlooker();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [media, setMedia] = useState<Record<string, string>>({});
  const [category, setCategory] = useState<CommunityCategory | "all">("all");
  const [tag, setTag] = useState<string | null>(null);
  const [categoryId, setCategoryId] = useState<BroadcastCategoryId | null>(null);

  // Deep link from the Home "Explore by vibe" grid: /community?cat=<lane id>
  // preselects that lane so the feed opens already filtered to it.
  useEffect(() => {
    if (!cat) return;
    const lane = BROADCAST_CATEGORIES.find((entry) => entry.id === cat);
    if (!lane) return;
    setCategoryId(lane.id);
    setCategory(lane.communityCategory);
    setTag(null);
    setStrangeSightings(false);
    setVibeGridOpen(true);
  }, [cat]);
  const [strangeSightings, setStrangeSightings] = useState(false);
  const [view, setView] = useState<"feed" | "map" | "alerts">("feed");
  const [source, setSource] = useState<"all" | "following">("all");
  const filtersActive = view === "alerts" || source === "following";
  const [followedIds, setFollowedIds] = useState<string[]>([]);
  const [composing, setComposing] = useState(false);
  const [listingEvent, setListingEvent] = useState(false);
  const [vibeGridOpen, setVibeGridOpen] = useState(false);
  const [liveFirst, setLiveFirst] = useState(false);
  const [loading, setLoading] = useState(true);
  /** Shown inline with a retry, so a failed load never leaves a blank page. */
  const [loadError, setLoadError] = useState<string | null>(null);
  const [radius, setRadius] = useState<RadiusChoiceId>("near");
  const [focus, setFocus] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const vibeRowRef = useRef<HTMLDivElement | null>(null);
  const [vibeScroll, setVibeScroll] = useState({ width: 100, left: 0 });
  const stateRestored = useRef(false);
  useSessionScroll("onlooker:scroll:community", !loading);
  const updateVibeScroll = useCallback(() => {
    const el = vibeRowRef.current;
    if (!el || el.scrollWidth <= el.clientWidth) {
      setVibeScroll({ width: 100, left: 0 });
      return;
    }
    const width = (el.clientWidth / el.scrollWidth) * 100;
    const left = (el.scrollLeft / el.scrollWidth) * 100;
    setVibeScroll({ width, left });
  }, []);
  useEffect(() => {
    updateVibeScroll();
    window.addEventListener("resize", updateVibeScroll);
    return () => window.removeEventListener("resize", updateVibeScroll);
  }, [updateVibeScroll]);
  const { area, busy: locationBusy, error: locationError, useMyLocation, setCity, applyPlace } = useDiscoveryArea();
  const center = useMemo<MapPosition>(() => ({ lat: area.latitude, lng: area.longitude }), [area]);

  const { unit, formatDistance } = useDistanceUnit(center);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const rows = await listCommunityPosts();
      setPosts(rows);
      /* Media URLs are a nice-to-have: a failure here must not empty the feed. */
      try {
        setMedia(await communityMediaUrls(rows));
      } catch {
        setMedia({});
      }
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Couldn't load Discover.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) {
      setFollowedIds([]);
      return;
    }
    let alive = true;
    const load = () =>
      listFollowedCreatorIds()
        .then((ids) => {
          if (alive) setFollowedIds(ids);
        })
        .catch((err) => {
          console.error("[community] could not load followed creators", err);
          if (alive) setFollowedIds([]);
        });
    void load();
    const refresh = () => void load();
    window.addEventListener(FOLLOWS_CHANGED_EVENT, refresh);
    return () => {
      alive = false;
      window.removeEventListener(FOLLOWS_CHANGED_EVENT, refresh);
    };
  }, [user?.id]);

  useEffect(() => {
    const saved = readSessionState<{
      category?: CommunityCategory | "all";
      tag?: string | null;
      categoryId?: BroadcastCategoryId | null;
      strangeSightings?: boolean;
      view?: "feed" | "map" | "alerts";
      source?: "all" | "following";
      radius?: RadiusChoiceId;
      vibeGridOpen?: boolean;
      focus?: { lat: number; lng: number; label: string } | null;
    }>("onlooker:view:community", {});
    // A ?cat= deep link (Home vibe grid) wins over the saved filter state.
    const deepLinkCat = new URLSearchParams(window.location.search).get("cat");
    const deepLinkLane = deepLinkCat ? BROADCAST_CATEGORIES.find((entry) => entry.id === deepLinkCat) : null;
    const savedCategory = saved.category;
    if (deepLinkLane) {
      setCategoryId(deepLinkLane.id);
      setCategory(deepLinkLane.communityCategory);
      setTag(null);
      setStrangeSightings(false);
      setVibeGridOpen(true);
    } else {
      if (savedCategory === "all") setCategory("all");
      else if (savedCategory && COMMUNITY_CATEGORIES.some((item) => item.id === savedCategory)) setCategory(savedCategory);
      setTag(saved.tag ?? null);
      if (saved.categoryId === null || BROADCAST_CATEGORIES.some((item) => item.id === saved.categoryId)) setCategoryId(saved.categoryId ?? null);
      setStrangeSightings(Boolean(saved.strangeSightings));
    }
    if (saved.view === "feed" || saved.view === "map" || saved.view === "alerts") setView(saved.view);
    if (saved.source === "all" || saved.source === "following") setSource(saved.source);
    if (RADIUS_CHOICES.some((item) => item.id === saved.radius)) setRadius(saved.radius ?? "near");
    if (!deepLinkLane) setVibeGridOpen(Boolean(saved.vibeGridOpen));
    setFocus(saved.focus ?? null);
    stateRestored.current = true;
  }, []);

  useEffect(() => {
    if (!stateRestored.current) return;
    writeSessionState("onlooker:view:community", {
      category,
      tag,
      categoryId,
      strangeSightings,
      view,
      source,
      radius,
      vibeGridOpen,
      focus,
    });
  }, [category, tag, categoryId, strangeSightings, view, source, radius, vibeGridOpen, focus]);

  useEffect(() => {
    if (!mystery) return;
    setStrangeSightings(true);
    setCategory("all");
    setCategoryId(null);
    setTag(null);
    setVibeGridOpen(true);
    if (mystery === "report") {
      setLiveFirst(false);
      setComposing(true);
    }
  }, [mystery]);

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

  const followedSet = useMemo(() => new Set(followedIds), [followedIds]);

  const visible = useMemo(() => {
    const limit = radiusMilesFor(radius);
    const sort = (list: Array<{ post: CommunityPost; miles: number | null }>) =>
      [...list].sort((a, b) => {
        const pinDiff = Number(isPinned(b.post)) - Number(isPinned(a.post));
        if (pinDiff !== 0) return pinDiff;
        // Creators you follow always rise above the rest of the feed.
        const followDiff =
          Number(followedSet.has(b.post.userId)) - Number(followedSet.has(a.post.userId));
        if (followDiff !== 0) return followDiff;
        if (a.miles !== null && b.miles !== null) return a.miles - b.miles;
        if (a.miles !== null) return -1;
        if (b.miles !== null) return 1;
        return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
      });

    const inRange = posts
      .map((p) => ({ post: p, miles: distanceFor(p) }))
      .filter(({ miles }) => limit === null || (miles !== null && miles <= limit));

    const inLane = inRange.filter(({ post }) => {
      if (strangeSightings) {
        return matchesStrangeSighting(`${post.title} ${post.body} ${post.place} ${post.tags.join(" ")}`);
      }
      if (category === "all") return true;
      if (post.category !== category) return false;
      return !categoryId || post.tags.some((postTag) => postTag.toLowerCase() === categoryId);
    });
    const followedOnly =
      source === "following" ? inLane.filter(({ post }) => followedSet.has(post.userId)) : inLane;
    const exact = tag ? followedOnly.filter(({ post }) => matchesTag(post, tag)) : followedOnly;

    // Subcategory pills are strict: never substitute sibling or unrelated posts.
    return sort(exact);
  }, [posts, category, categoryId, strangeSightings, tag, radius, distanceFor, matchesTag, source, followedSet]);

  const featured = visible.filter((r) => isPinned(r.post));
  const rest = visible.filter((r) => !isPinned(r.post));

  /**
   * Radius fallback: when the chosen radius yields zero posts, keep the feed
   * alive with the most popular posts from anywhere (same category/tag lane).
   * "Anywhere" has no limit, so it never needs a fallback.
   */
  const popularFallback = useMemo(() => {
    if (loading || visible.length > 0 || source !== "all") return [];
    if (radiusMilesFor(radius) === null) return [];
    const inLane = posts
      .map((p) => ({ post: p, miles: distanceFor(p) }))
      .filter(({ post }) => {
        if (strangeSightings) {
          return matchesStrangeSighting(
            `${post.title} ${post.body} ${post.place} ${post.tags.join(" ")}`,
          );
        }
        if (category === "all") return true;
        if (post.category !== category) return false;
        return !categoryId || post.tags.some((t) => t.toLowerCase() === categoryId);
      });
    const exact = tag ? inLane.filter(({ post }) => matchesTag(post, tag)) : inLane;
    return [...exact]
      .sort((a, b) => {
        const pinDiff = Number(isPinned(b.post)) - Number(isPinned(a.post));
        if (pinDiff !== 0) return pinDiff;
        const popDiff = b.post.validationCount - a.post.validationCount;
        if (popDiff !== 0) return popDiff;
        return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
      })
      .slice(0, 12);
  }, [
    loading,
    visible.length,
    source,
    radius,
    posts,
    category,
    categoryId,
    strangeSightings,
    tag,
    distanceFor,
    matchesTag,
  ]);

  /** A hashtag behaves exactly like a vibe card: it opens the map filtered to it. */
  const openTagOnMap = useCallback((wanted: string) => {
    setTag(wanted);
    setStrangeSightings(false);
    setFocus(null);
    setView("map");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

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
      onTagClick={openTagOnMap}
      onChanged={() => void load()}
    />
  );

  return (
    <main className="overflow-x-hidden bg-background">
      <div className="mx-auto w-full max-w-7xl">
      <header className="px-5 pt-[calc(env(safe-area-inset-top)+1.25rem)] sm:px-8">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Go back"
              onClick={() => {
                if (canGoBack) {
                  router.history.back();
                  return;
                }
                void navigate({ to: "/" });
              }}
              className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:border-white/25 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="size-5" />
            </button>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">
              <Compass className="size-4" /> Discover
            </p>
          </div>
          <button
            type="button"
            aria-label="Close community"
            onClick={() => {
              if (canGoBack) {
                router.history.back();
                return;
              }
              void navigate({ to: "/" });
            }}
            className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:border-white/25 hover:bg-secondary hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X className="size-5" />
          </button>
        </div>
        <h1 className="mt-2 text-balance text-center text-xl font-extrabold leading-tight text-foreground sm:whitespace-nowrap sm:text-2xl">
          See what your city is doing now
        </h1>
        <p className="mt-1 text-center text-sm font-semibold text-muted-foreground">
          A live local stream, tap a lane, tighten the radius, or open the map.
        </p>
        <div className="mt-4">
          <BroadcastCategoryPicker
            categoryId={categoryId}
            subcategory={tag}
            allowAll
            laneLabel="Discover category"
            menuLabel="Browse all categories"
            allLabel="All live content"
            onCategoryChange={(next) => {
              setCategoryId(next);
              if (!next) {
                setCategory("all");
                setTag(null);
                return;
              }
              setCategory(broadcastCategoryById(next).communityCategory);
              setTag(null);
            }}
            onSubcategoryChange={setTag}
          />
        </div>
      </header>

      {/* The dropdown drives the cards: a selection narrows both views to that
          lane, "All live content" restores the full set. */}
      {(() => {
        const selectedLane = categoryId ? broadcastCategoryById(categoryId) : null;
        const gridLanes = selectedLane
          ? BROADCAST_CATEGORIES.filter((lane) => lane.id === selectedLane.id)
          : BROADCAST_CATEGORIES;
        const carouselLanes = selectedLane
          ? COMMUNITY_CATEGORIES.filter((c) => c.id === selectedLane.communityCategory)
          : COMMUNITY_CATEGORIES;
        return (
      <section aria-label="Discover categories" className="mt-6">
        <div className="mb-3 flex items-center justify-between gap-2 px-5 sm:px-8">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] text-foreground">Explore by vibe</h2>
          <div className="flex items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setVibeGridOpen((open) => !open)}
              aria-expanded={vibeGridOpen}
              className="h-auto p-0 text-xs font-bold text-muted-foreground underline decoration-muted-foreground/40 underline-offset-4 hover:bg-transparent hover:text-foreground"
            >
              {vibeGridOpen ? "Hide" : "See All"}
            </Button>
          </div>
        </div>
        {/* Mobile keeps the sideways carousel; "See All" opens every browse category. */}
        <div className="relative">
          {/* Subtle gradient edge fades while the carousel is scrolling */}
          {!vibeGridOpen && (
            <>
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-0 z-10 w-8 bg-gradient-to-r from-background via-background/70 to-transparent md:hidden" />
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 z-10 w-8 bg-gradient-to-l from-background via-background/70 to-transparent md:hidden" />
            </>
          )}
        {vibeGridOpen ? (
          <div
            role="list"
            aria-label="All category cards"
            className={`no-scrollbar grid max-h-[70dvh] gap-2 overflow-y-auto px-3 pb-4 sm:gap-2.5 md:gap-3 ${gridLanes.length === 1 ? "grid-cols-1" : "grid-cols-4 md:grid-cols-4"}`}
          >
            {gridLanes.map((lane) => {
              const visual = COMMUNITY_VISUALS[lane.communityCategory] ?? COMMUNITY_VISUALS.general;
              const Icon = visual.icon;
              const previewUrl = categoryPreviews[lane.communityCategory];
              const active = categoryId === lane.id;
              return (
                <div key={lane.id} role="listitem" className="min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryId(lane.id);
                      setCategory(lane.communityCategory);
                      setTag(null);
                      setStrangeSightings(false);
                    }}
                    aria-pressed={active}
                    className={`group flex ${gridLanes.length === 1 ? "relative h-64 sm:h-72" : "h-40 sm:h-44 md:h-48"} w-full flex-col overflow-hidden rounded-xl border bg-zinc-900/50 backdrop-blur-md text-left transition-transform hover:-translate-y-0.5 ${active ? "border-signal ring-2 ring-signal/40 shadow-[0_0_20px_rgba(204,255,0,0.18)]" : "border-white/10 hover:border-white/25"}`}
                  >
                    <span className={`relative block min-h-0 w-full overflow-hidden ${gridLanes.length === 1 ? "absolute inset-0" : "flex-1"}`}>
                      <LoopingPreview
                        videoUrl={previewUrl}
                        imageUrl={previewUrl ? undefined : BROADCAST_CATEGORY_ART[lane.id]}
                        alt={previewUrl ? `Live preview for ${lane.label}` : `${lane.label} category`}
                        icon={Icon}
                        coverClass={visual.coverClass}
                      />
                      <span className="absolute left-1.5 top-1.5 grid size-6 place-items-center rounded-md bg-background/70 text-sm backdrop-blur-sm" aria-hidden="true">
                        {lane.icon}
                      </span>
                    </span>
                    {gridLanes.length === 1 && (
                      <span aria-hidden="true" className="pointer-events-none absolute inset-0 bg-gradient-to-t from-background via-background/25 to-transparent" />
                    )}
                    <span className={`flex min-w-0 flex-col items-center gap-0.5 px-2 py-2 text-center ${gridLanes.length === 1 ? "absolute inset-x-0 bottom-0 z-10 pb-4" : "flex-1"}`}>
                      <strong className="line-clamp-2 text-[0.9rem] font-extrabold leading-tight text-foreground">{lane.label}</strong>
                      <small className="line-clamp-2 text-[0.72rem] font-semibold leading-snug text-muted-foreground">
                        {lane.subcategories.slice(0, 2).join(" · ")}
                      </small>
                    </span>
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
        <div
          ref={vibeRowRef}
          onScroll={updateVibeScroll}
          role="list"
          aria-label="Category cards"
          className="no-scrollbar flex flex-row snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible lg:grid-cols-3"
        >
          {carouselLanes.map((c) => {
            const visual = COMMUNITY_VISUALS[c.id] ?? COMMUNITY_VISUALS.general;
            const Icon = visual.icon;
            const previewUrl = categoryPreviews[c.id];
            const active = category === c.id;
            return (
              <button
                key={c.id}
                type="button"
                role="listitem"
                onClick={() => {
                  setCategory(c.id);
                  setTag(null);
                  setCategoryId(null);
                  setStrangeSightings(false);
                }}
                aria-pressed={active}
                className={`group relative ${carouselLanes.length === 1 ? "h-44 w-full" : "h-32 w-[280px]"} flex-shrink-0 snap-start overflow-hidden rounded-2xl border border-white/10 bg-zinc-900/50 text-left transition-transform hover:-translate-y-0.5 hover:border-white/25 md:h-40 md:w-full ${active ? "border-signal ring-2 ring-signal/40 shadow-[0_0_20px_rgba(204,255,0,0.18)] scale-[1.02]" : ""}`}
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
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${active ? "bg-signal text-signal-foreground" : "bg-white/10 text-foreground"}`}><Icon className="size-4" /></span>
                  <span><strong className="block text-sm leading-tight">{c.label}</strong><small className="mt-0.5 line-clamp-1 block text-[0.65rem] font-semibold text-muted-foreground">{c.blurb}</small></span>
                </span>
              </button>
            );
          })}
        </div>
        )}
        {!vibeGridOpen && (
          <div className="mx-4 mt-1 h-1.5 rounded-full bg-surface-raised md:hidden" aria-hidden="true">
            <div
              className="h-full rounded-full bg-white/30 transition-[width,margin] duration-100"
              style={{
                width: `${Math.max(vibeScroll.width, 12)}%`,
                marginLeft: `${vibeScroll.left}%`,
              }}
            />
          </div>
        )}
        </div>


      </section>
        );
      })()}

      {!loading && category !== "all" && (
        <div className="mt-5 px-5 sm:px-8">
          <CategoryExampleCards
            category={category}
            tag={tag}
            labelOverride={strangeSightings ? STRANGE_SIGHTINGS_LABEL : categoryId ? broadcastCategoryById(categoryId).label : null}
            broadcastCategoryId={categoryId}
            onStart={(exampleCategory) => {
              setCategory(exampleCategory);
              setLiveFirst(false);
              setComposing(true);
            }}
          />
        </div>
      )}

      {strangeSightings && (
        <section className="mx-5 mt-4 rounded-xl border border-white/10 bg-zinc-900/50 px-4 py-3 backdrop-blur-md sm:mx-8">
          <p className="text-xs font-extrabold uppercase tracking-[0.12em] text-muted-foreground">Mystery desk</p>
          <h2 className="mt-1 text-lg font-extrabold text-foreground">Report, investigate, or request proof</h2>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            <Button type="button" onClick={() => { setLiveFirst(false); setComposing(true); }} className="h-auto min-h-10 whitespace-normal text-xs">Report Sighting</Button>
            <Button type="button" variant="outline" onClick={() => { setView("feed"); window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" }); }} className="h-auto min-h-10 whitespace-normal text-xs">View Community Logs</Button>
            <Button asChild variant="outline" className="h-auto min-h-10 whitespace-normal text-xs"><Link to="/post" search={{ mystery: "1" }}>Request a Mystery Bounty</Link></Button>
          </div>
        </section>
      )}

      <ScrollableLane
        className="mt-1 -mx-5 sm:-mx-8"
        innerClassName="gap-1.5 px-5 pb-0.5 sm:px-8"
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
            title={`Open the map filtered to #${t}`}
            onClick={() => {
              if (tag === t && view === "map") {
                setTag(null);
                setView("feed");
                return;
              }
              openTagOnMap(t);
            }}
            className={`h-8 shrink-0 rounded-full px-3 text-[0.68rem] font-semibold ${
              tag === t
                ? "border-signal bg-signal/10 text-signal"
                : "border-white/10 bg-zinc-900/50 text-muted-foreground hover:border-white/25"
            }`}
          >
            #{t}
          </Button>
        ))}
      </ScrollableLane>


      <div className="mt-2 px-5 sm:px-8">
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

      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 px-5 sm:px-8">
        <div className="flex items-center gap-3">
          {/* View switch — segmented tab control */}
          <div
            role="tablist"
            aria-label="Content view"
            className="flex rounded-lg border border-border bg-surface p-1 shadow-inner"
          >
            <button
              type="button"
              role="tab"
              aria-selected={view !== "alerts"}
              onClick={() => setView("feed")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                view === "feed"
                  ? "bg-signal text-signal-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5"><Rows3 className="size-3.5" /> Feed</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={view === "map"}
              onClick={() => setView("map")}
              className={`rounded-md px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide transition-colors ${
                view === "map"
                  ? "bg-signal text-signal-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <span className="flex items-center gap-1.5"><MapIcon className="size-3.5" /> Map</span>
            </button>
          </div>

          {/* Filters — funnel dropdown */}
          <Popover>
            <PopoverTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                aria-label="Filters"
                className={`relative rounded-lg border-border bg-surface text-xs font-bold uppercase tracking-wide ${
                  filtersActive ? "border-signal/60 text-signal" : "text-muted-foreground"
                }`}
              >
                <Filter className="size-3.5" /> Filters
                {filtersActive && (
                  <span className="absolute -right-1 -top-1 size-2 rounded-full bg-signal" aria-hidden="true" />
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-60 rounded-xl border-border bg-surface p-2">
              <p className="px-2 pb-1 pt-1.5 text-[10px] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
                Filters
              </p>
              <button
                type="button"
                onClick={() => setView(view === "alerts" ? "feed" : "alerts")}
                aria-pressed={view === "alerts"}
                className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                  view === "alerts" ? "bg-crisis/15 text-crisis" : "text-foreground hover:bg-muted"
                }`}
              >
                <Siren className={`size-4 shrink-0 ${view === "alerts" ? "animate-red-flash motion-reduce:animate-none" : ""}`} />
                <span className="flex-1 text-left">Emergency alerts</span>
                {view === "alerts" && <Check className="size-4" />}
              </button>
              <div className="my-1.5 h-px bg-border" aria-hidden="true" />
              {([
                { id: "all", label: "Everyone", icon: null },
                { id: "following", label: "Following", icon: UserCheck },
              ] as const).map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSource(id)}
                  aria-pressed={source === id}
                  className={`flex w-full items-center gap-2.5 rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                    source === id ? "bg-signal/15 text-signal" : "text-foreground hover:bg-muted"
                  }`}
                >
                  {Icon ? <Icon className="size-4 shrink-0" /> : <span className="size-4 shrink-0" aria-hidden="true" />}
                  <span className="flex-1 text-left">{label}</span>
                  {source === id && <Check className="size-4" />}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setLiveFirst(true);
              setComposing(true);
            }}
            className="rounded-full border-white/15 text-xs font-extrabold uppercase tracking-[0.1em] text-foreground"
          >
            <Radio className="size-4" /> Start live stream
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setListingEvent(true)}
            className="rounded-full border-white/15 text-xs font-extrabold uppercase tracking-[0.1em] text-foreground"
          >
            <CalendarPlus className="size-4" /> List an event
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

      {view === "alerts" ? (
        <div className="mt-5 px-5 sm:px-8">
          <SectionBoundary label="Emergency alert map">
            <div className="mt-6 rounded-2xl border-2 border-crisis/50 bg-crisis/10 px-4 py-3">


              <p className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.12em] text-crisis">
                <Siren className="size-4" /> Emergency alerts only
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                High-priority fire, police and medical reports filed by verified Level 3 creators. Bounties and general activity stay on the main feed.
              </p>
            </div>
            <GlobalFeedMap
              reports={posts}
              viewportStorageKey="onlooker:map:community-alerts"
              emergencyOnly
            />
          </SectionBoundary>
        </div>
      ) : view === "map" ? (
        <div className="mt-5 px-5 sm:px-8">
          <SectionBoundary label="The map">
            <GlobalFeedMap
              focus={focus}
              reports={posts}
              viewportStorageKey="onlooker:map:community"
              categoryLabel={strangeSightings ? STRANGE_SIGHTINGS_LABEL : categoryId ? broadcastCategoryById(categoryId).label : null}
              {...(strangeSightings ? { categoryId: STRANGE_SIGHTINGS_ID } : { categoryId })}
              subcategory={tag}
            />
          </SectionBoundary>
        </div>
      ) : (
        <section className="mt-3 px-5 sm:px-8">
          <SectionBoundary label="The community feed">
          {loading && <p className="text-sm text-muted-foreground">Loading Discover…</p>}
          {!loading && loadError && (
            <div className="rounded-2xl border border-dashed border-border bg-surface p-5 text-center">
              <p className="text-sm font-semibold text-foreground">We couldn't load the feed</p>
              <p className="mt-1 text-xs text-muted-foreground">{loadError}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => void load()}
                className="mt-3 h-10 rounded-full px-4 text-xs font-extrabold"
              >
                Try again
              </Button>
            </div>
          )}
          {!loading && source === "following" && visible.length === 0 && (
            <div className="mb-6 rounded-2xl border border-dashed border-border bg-card p-6 text-center">
              <p className="text-sm text-muted-foreground">
                {followedIds.length === 0
                  ? "You don't follow anyone yet. Tap Follow on a creator and their posts land here first."
                  : "Nobody you follow has posted in this area yet."}
              </p>
              <Button
                type="button"
                size="sm"
                onClick={() => setSource("all")}
                className="mt-4 rounded-full bg-signal px-5 text-xs font-extrabold uppercase tracking-[0.1em] text-signal-foreground hover:bg-signal/90"
              >
                Browse everyone
              </Button>
            </div>
          )}
          {!loading && source === "all" && visible.length === 0 && popularFallback.length > 0 && (
            <div className="mb-6">
              <div className="rounded-2xl border border-border bg-surface px-5 py-4 text-center">
                <p className="text-sm font-semibold text-foreground">
                  Nothing nearby yet — here's what's popular.
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Widen your radius from the location pill to bring these into your local feed.
                </p>
              </div>
              <div className="mt-6 grid grid-cols-1 items-start gap-6 md:grid-cols-3">
                {popularFallback.map(renderCard)}
              </div>
            </div>
          )}
          {!loading && source === "all" && visible.length === 0 && popularFallback.length === 0 && category === "all" && radiusMilesFor(radius) !== null && (
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
          <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-3">
            {rest.map(renderCard)}
          </div>
          {/* Live activity is thin here, fall back to the evergreen clip archive. */}
          {!loading && visible.length < 3 && (
            <div className="mt-6">
              <RecentCapturesFeed
                title="Recent captures"
                blurb="Quiet nearby right now, here are streams that already wrapped."
              />
            </div>
          )}
          </SectionBoundary>
        </section>
      )}

      <NewLocalEventDialog
        open={listingEvent}
        onOpenChange={setListingEvent}
        onPosted={() => void load()}
      />

      <NewCommunityPostDialog
        open={composing}
        onOpenChange={setComposing}
        onPosted={() => void load()}
        initialCamera={liveFirst}
        {...(strangeSightings ? { initialCategory: "general" as const, initialTitle: "Strange sighting near ", initialTags: [STRANGE_SIGHTINGS_ID, "UFO"] } : {})}
        {...(!strangeSightings && category !== "all" ? { initialCategory: category } : {})}
        {...(!strangeSightings && categoryId ? { initialBroadcastCategoryId: categoryId } : {})}
      />
      </div>

    </main>
  );
}
