import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  Compass,
  History,
  Map,
  MapPin,
  Martini,
  Radio,
  Search,
  ShieldCheck,
  Siren,
  Sparkles,
  Ticket,
  TrafficCone,
  Trees,
  Utensils,
  Users,
  Video,
  Volume2,
  Clock3,
  Eye,
  Flame,
  Image,
  Trophy,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
import { MapCanvas } from "@/components/MapCanvas";
import { BountyBottomSheet } from "@/components/BountyBottomSheet";
import { isGoldBounty } from "@/lib/bounty-tiers";
import { useBoosts } from "@/lib/boosts-store";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import {
  distanceMiles,
  requestMapPosition,
  type CategoryId,
  type LiveRequest,
  type MapPosition,
} from "@/lib/onlooker";
import { Button } from "@/components/ui/button";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { saveMyLocation } from "@/lib/hunter-location";

import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { FlashBountyButton } from "@/components/FlashBountyButton";
import { readRecentPlaces, rememberRecentPlace, type RecentPlace } from "@/lib/recent-places";
import { communityMediaUrls, listCommunityPosts, type CommunityPost } from "@/lib/community";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { listTopCreators, type TopCreator } from "@/lib/top-creators";

const TRENDING_RADIUS_MILES = 2;

const MAP_CATEGORY_TILES: Array<{
  id: string;
  label: string;
  icon: typeof Utensils;
  categories: CategoryId[];
  crisis?: boolean;
  gathering?: boolean;
  trending?: boolean;
  viral?: boolean;
  creators?: boolean;
  crime?: boolean;
  scanner?: boolean;
  liveStreams?: boolean;
  bountyMap?: boolean;
  communityLink?: boolean;
  guidesLink?: boolean;
  theme?: { emoji: string; active: string; badge: string };
}> = [
  {
    id: "food", label: "Food & markets", icon: Utensils, categories: ["food", "markets"],
    theme: { emoji: "🍔", active: "border-orange-500 bg-orange-500/20 text-orange-50", badge: "text-orange-400" },
  },
  {
    id: "events", label: "Events & arts", icon: Ticket, categories: ["events", "sports", "art"],
    theme: { emoji: "🎭", active: "border-purple-500 bg-purple-500/20 text-purple-50", badge: "text-purple-400" },
  },
  {
    id: "outdoors", label: "Outdoors", icon: Trees, categories: ["outdoors", "weather"],
    theme: { emoji: "🌲", active: "border-green-500 bg-green-500/20 text-green-50", badge: "text-green-400" },
  },
  {
    id: "traffic", label: "Traffic & transit", icon: TrafficCone, categories: ["transit", "parking", "vehicles"],
    theme: { emoji: "🚗", active: "border-amber-400 bg-amber-400/20 text-amber-50", badge: "text-amber-400" },
  },
  {
    id: "nightlife", label: "Nightlife", icon: Martini, categories: ["nightlife"],
    theme: { emoji: "🍸", active: "border-fuchsia-500 bg-fuchsia-500/20 text-fuchsia-50", badge: "text-fuchsia-400" },
  },
  {
    id: "emergencies", label: "Emergencies", icon: Siren, categories: ["community", "weather"], crisis: true,
    theme: { emoji: "🚨", active: "border-red-500 bg-red-500/20 text-red-50", badge: "text-red-500" },
  },
  {
    id: "gatherings", label: "Public Gathering", icon: Users, categories: ["events", "sports", "art", "community", "markets"], gathering: true,
    theme: { emoji: "👥", active: "border-blue-400 bg-blue-400/20 text-blue-50", badge: "text-blue-400" },
  },
  {
    id: "trending", label: "Trending Near You", icon: Flame, categories: [], trending: true,
    theme: { emoji: "🔥", active: "border-[#FF7F50] bg-[#FF7F50]/20 text-[#FFE4DC]", badge: "text-[#FF7F50]" },
  },
  {
    id: "viral", label: "Viral & Breaking", icon: Sparkles, categories: [], viral: true,
    theme: { emoji: "⚡", active: "border-cyan-400 bg-linear-to-br from-cyan-500/40 to-sky-500/20 text-cyan-50", badge: "text-cyan-400" },
  },
  {
    id: "creators", label: "Top Creators", icon: Trophy, categories: [], creators: true,
    theme: { emoji: "👑", active: "border-yellow-500 bg-yellow-500/20 text-yellow-50", badge: "text-yellow-500" },
  },
  {
    id: "crime", label: "Crime Reports", icon: Siren, categories: [],
    crime: true,
    theme: { emoji: "🚨", active: "border-rose-500 bg-rose-500/20 text-rose-50", badge: "text-rose-400" },
  },
  {
    id: "scanner", label: "Scanner", icon: Radio, categories: [],
    scanner: true,
    theme: { emoji: "📻", active: "border-violet-500 bg-violet-500/20 text-violet-50", badge: "text-violet-400" },
  },
  {
    id: "livestream", label: "Live Stream", icon: Video, categories: [],
    liveStreams: true,
    theme: { emoji: "📹", active: "border-lime-400 bg-lime-400/20 text-lime-50", badge: "text-lime-400" },
  },
  {
    id: "bountymap", label: "Bounty Map", icon: Map, categories: [],
    bountyMap: true,
    theme: { emoji: "🗺️", active: "border-teal-500 bg-teal-500/20 text-teal-50", badge: "text-teal-400" },
  },
  {
    id: "community", label: "Community", icon: Users, categories: ["community"],
    communityLink: true,
    theme: { emoji: "👥", active: "border-sky-400 bg-sky-400/20 text-sky-50", badge: "text-sky-400" },
  },
  {
    id: "guides", label: "Guides", icon: BookOpen, categories: [],
    guidesLink: true,
    theme: { emoji: "🧭", active: "border-indigo-400 bg-indigo-400/20 text-indigo-50", badge: "text-indigo-400" },
  },
];

const CRISIS_TERMS = [
  "accident", "crash", "collision", "emergency", "fire", "flood", "hazard", "rescue", "smoke", "storm",
];

function trafficIncidentType(request: LiveRequest) {
  const text = `${request.title} ${request.note} ${request.instructions ?? ""}`.toLowerCase();
  if (/clos|detour|blocked/.test(text)) return "Road closure";
  if (/crash|accident|collision|vehicle/.test(text)) return "Vehicle incident";
  if (/train|bus|transit|station/.test(text)) return "Transit update";
  return "Heavy traffic";
}

function liveTimestamp(minutesAgo: number) {
  if (minutesAgo < 1) return "Updated now";
  return `Updated ${minutesAgo}m ago`;
}

function isCrisisRequest(request: LiveRequest) {
  if (request.category !== "community" && request.category !== "weather") return false;
  const text = `${request.title} ${request.note} ${request.instructions ?? ""}`.toLowerCase();
  return CRISIS_TERMS.some((term) => text.includes(term));
}

const CRIME_TERMS = [
  "crime", "theft", "stolen", "robbery", "police", "cops", "arrest", "shooting", "vandalism", "suspicious", "mugging", "assault", "broke into",
];

function isCrimeRequest(request: LiveRequest) {
  const text = `${request.title} ${request.note} ${request.instructions ?? ""}`.toLowerCase();
  return CRIME_TERMS.some((term) => text.includes(term));
}

const SCANNER_CATEGORIES: Array<CategoryId> = ["transit", "parking", "vehicles"];

function tileMatches(
  tile: (typeof MAP_CATEGORY_TILES)[number],
  request: LiveRequest,
  userPosition: MapPosition | null,
): boolean {
  if (tile.creators) return false;
  if (tile.trending) {
    return Boolean(userPosition && distanceMiles(userPosition, requestMapPosition(request)) <= TRENDING_RADIUS_MILES);
  }
  if (tile.viral || tile.bountyMap) return true;
  if (tile.crisis) return isCrisisRequest(request);
  if (tile.crime) return isCrimeRequest(request);
  if (tile.scanner) {
    return isCrisisRequest(request) || (request.category !== undefined && SCANNER_CATEGORIES.includes(request.category));
  }
  if (tile.liveStreams) {
    return request.bountyType === "live_stream" && request.status === "claimed" && !isClosed(request);
  }
  return Boolean(request.category && tile.categories.includes(request.category));
}

export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { b?: string | undefined; snap?: string | undefined } => ({
    b: typeof search["b"] === "string" ? search["b"] : undefined,
    snap: search["snap"] === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Onlooker, Live views from people already there" },
      {
        name: "description",
        content:
          "Onlooker connects live streaming with real-world accountability. Post a bounty, lock credits, and release them after verified proof.",
      },
      { property: "og:title", content: "Onlooker | Live proof backed by locked credits" },
      {
        property: "og:description",
        content: "Post a bounty, lock credits, and release them only after real-world proof is verified.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapScreen,
});

function MapScreen() {
  const { requests, selectedId, select, claim } = useOnlooker();
  const navigate = useNavigate();
  const { b } = Route.useSearch();
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [recentPlaces, setRecentPlaces] = useState<RecentPlace[]>([]);
  const [mapFilter, setMapFilter] = useState<"all" | "live" | "nearby" | "high">("all");
  const [categoryTile, setCategoryTile] = useState<string | null>(null);
  const [scannerNotice, setScannerNotice] = useState(false);
  const [gatheringClusterIds, setGatheringClusterIds] = useState<string[]>([]);
  const [nearbyPosts, setNearbyPosts] = useState<CommunityPost[]>([]);
  const [nearbyPostMedia, setNearbyPostMedia] = useState<Record<string, string>>({});
  const [trendingLoading, setTrendingLoading] = useState(false);
  const [topCreators, setTopCreators] = useState<TopCreator[]>([]);
  const [creatorsLoading, setCreatorsLoading] = useState(false);
  const [centerTarget, setCenterTarget] = useState<(MapPosition & { zoom?: number }) | null>(null);
  const [guidesOpen, setGuidesOpen] = useState(false);
  const dragStartY = useRef<number | null>(null);
  const drawerDragged = useRef(false);

  const { boostOf } = useBoosts();
  const { unit, radius, radiusMiles, formatDistance } = useDistanceUnit(userPosition);

  // Send expired, unfulfilled deposits back to their requesters.
  useEffect(() => {
    void refundExpiredBounties();
  }, []);

  // Remember where this person is so nearby bounty alerts can reach them.
  useEffect(() => {
    if (!userPosition) return;
    void saveMyLocation(userPosition.lat, userPosition.lng);
  }, [userPosition]);

  // Opening a shared bounty link lands straight on that pin.
  useEffect(() => {
    if (b) select(b);
  }, [b, select]);

  useEffect(() => {
    setRecentPlaces(readRecentPlaces());
  }, []);

  const focusPlace = useCallback(
    (place: { formatted: string; latitude: number; longitude: number; label?: string }) => {
      setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
      setRecentPlaces(
        rememberRecentPlace({
          formatted: place.formatted,
          latitude: place.latitude,
          longitude: place.longitude,
          ...(place.label ? { label: place.label } : {}),
        }),
      );
      setSearchOpen(false);
    },
    [],
  );

  const finishDrawerDrag = useCallback((clientY: number) => {
    if (dragStartY.current === null) return;
    const distance = clientY - dragStartY.current;
    drawerDragged.current = Math.abs(distance) > 12;
    if (Math.abs(distance) > 36) setDrawerOpen(distance < 0);
    dragStartY.current = null;
  }, []);

  const poolOf = useCallback((request: LiveRequest) => request.bounty + boostOf(request.id), [boostOf]);

  // The Home sheet filters the live map immediately without changing the underlying request data.
  const statusFiltered = useMemo(
    () =>
      requests.filter((request) => {
        if (mapFilter === "all") return true;
        if (mapFilter === "high") return isGoldBounty(poolOf(request));
        if (mapFilter === "live") {
          return request.bountyType === "live_stream" && request.status === "claimed" && !isClosed(request);
        }
        if (!userPosition) return false;
        return distanceMiles(userPosition, requestMapPosition(request)) <= radiusMiles;
      }),
    [requests, mapFilter, poolOf, radiusMiles, userPosition],
  );

  const activeCategoryTile = MAP_CATEGORY_TILES.find((tile) => tile.id === categoryTile) ?? null;
  const crisisMode = activeCategoryTile?.crisis === true;
  const trafficMode = activeCategoryTile?.id === "traffic";
  const gatheringMode = activeCategoryTile?.gathering === true;
  const trendingMode = activeCategoryTile?.trending === true;
  const viralMode = activeCategoryTile?.viral === true;
  const creatorsMode = activeCategoryTile?.creators === true;
  const scannerMode = activeCategoryTile?.scanner === true;
  const visible = useMemo(() => {
    if (!activeCategoryTile) return statusFiltered;
    if (activeCategoryTile.creators) return [];
    const pool = activeCategoryTile.viral ? requests : statusFiltered;
    return pool.filter((request) => tileMatches(activeCategoryTile, request, userPosition));
  }, [activeCategoryTile, requests, statusFiltered, userPosition]);

  useEffect(() => {
    if (!trendingMode || !userPosition) return;
    let alive = true;
    setTrendingLoading(true);
    void listCommunityPosts()
      .then(async (posts) => {
        if (!alive) return;
        const local = posts
          .filter((post) => post.latitude !== null && post.longitude !== null)
          .filter((post) => distanceMiles(userPosition, { lat: post.latitude ?? 0, lng: post.longitude ?? 0 }) <= TRENDING_RADIUS_MILES)
          .sort((a, b) => {
            const score = (post: CommunityPost) =>
              (post.isFlash ? 100 : 0) + post.pinnedCredits * 2 - (Date.now() - new Date(post.createdAt).getTime()) / 60_000;
            return score(b) - score(a);
          });
        setNearbyPosts(local);
        setNearbyPostMedia(await communityMediaUrls(local));
      })
      .catch(() => {
        if (alive) setNearbyPosts([]);
      })
      .finally(() => {
        if (alive) setTrendingLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [trendingMode, userPosition]);

  useEffect(() => {
    if (!creatorsMode) return;
    let alive = true;
    setCreatorsLoading(true);
    void listTopCreators()
      .then((creators) => {
        if (alive) setTopCreators(creators);
      })
      .catch(() => {
        if (alive) setTopCreators([]);
      })
      .finally(() => {
        if (alive) setCreatorsLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [creatorsMode]);

  const selected = requests.find((r) => r.id === selectedId) ?? null;
  const nearby = useMemo(() => {
    if (!userPosition) return [];
    return requests
      .filter((request) => request.status === "open" && !isClosed(request))
      .map((request) => ({
        request,
        distance: distanceMiles(userPosition, requestMapPosition(request)),
      }))
      .filter(({ distance }) => distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance || b.request.bounty - a.request.bounty);
  }, [requests, userPosition, radiusMiles]);
  return (
    <div className="fixed inset-0">
      <MapCanvas
        requests={visible}
        selectedId={selectedId}
        onSelect={select}
        onUserPositionChange={setUserPosition}
        centerTarget={centerTarget}
        crisisMode={crisisMode}
        trafficMode={trafficMode}
        gatheringMode={gatheringMode}
        onGatheringClusterSelect={(ids) => {
          setGatheringClusterIds(ids);
          setDrawerOpen(true);
          select(null);
        }}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:px-6">
        <div className="pointer-events-auto ml-auto flex w-fit flex-col items-center gap-1 rounded-xl border border-border bg-surface/95 px-2.5 py-2 shadow-lg backdrop-blur-xl md:px-3 md:py-2.5 md:shadow-2xl">
          <img
            src="/icon-192.png"
            alt="Onlooker LLC logo"
            className="size-10 rounded-lg object-cover md:size-12"
          />
          <h1 className="text-xs font-extrabold leading-none tracking-tight text-foreground md:text-sm">
            Onlooker
          </h1>
          <p className="whitespace-nowrap text-[0.55rem] font-bold leading-none text-muted-foreground md:text-[0.6rem]">
            Live eyes, anywhere
          </p>
        </div>
        <div className="pointer-events-auto absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] md:left-1/2 md:w-[min(32rem,calc(100vw-14rem))] md:-translate-x-1/2">
          {searchOpen ? (
            <div className="flex w-[min(21rem,calc(100vw-6.25rem))] items-start gap-1.5 md:w-full">
              <div className="min-w-0 flex-1 rounded-full border border-border bg-surface/95 p-1 shadow-2xl backdrop-blur-xl">
                <PlaceSearchInput
                  autoFocus
                  placeholder="Search a city, place or landmark"
                  onPick={focusPlace}
                />
              </div>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface/95 text-foreground shadow-lg backdrop-blur-xl md:hidden"
              >
                <X className="size-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              aria-label="Search for a place"
              onClick={() => setSearchOpen(true)}
              className="flex h-11 items-center justify-start gap-2 rounded-full border border-border bg-surface/95 px-4 text-foreground shadow-2xl backdrop-blur-xl md:w-full"
            >
              <Search className="size-4 shrink-0 text-signal" />
              <span className="truncate text-sm font-bold text-muted-foreground">Search this area</span>
            </Button>
          )}
        </div>
      </header>

      <section
        className={`pointer-events-auto absolute inset-x-0 bottom-[5.85rem] z-40 mx-auto flex w-full flex-col overflow-hidden border-t border-border bg-surface/95 shadow-2xl backdrop-blur-xl transition-[max-height] duration-300 ease-out motion-reduce:transition-none sm:inset-x-auto sm:right-5 sm:w-[25rem] sm:rounded-t-xl sm:border-x ${drawerOpen ? "max-h-[min(68dvh,36rem)]" : "max-h-[8.75rem]"}`}
        aria-label="Map actions"
      >
        <Button
          type="button"
          variant="ghost"
          aria-expanded={drawerOpen}
          aria-label={drawerOpen ? "Collapse map drawer" : "Expand map drawer"}
          onClick={() => {
            if (drawerDragged.current) {
              drawerDragged.current = false;
              return;
            }
            setDrawerOpen((open) => !open);
          }}
          onPointerDown={(event) => {
            dragStartY.current = event.clientY;
            drawerDragged.current = false;
            event.currentTarget.setPointerCapture(event.pointerId);
          }}
          onPointerMove={(event) => {
            if (dragStartY.current !== null && Math.abs(event.clientY - dragStartY.current) > 12) {
              drawerDragged.current = true;
            }
          }}
          onPointerUp={(event) => finishDrawerDrag(event.clientY)}
          onPointerCancel={() => {
            dragStartY.current = null;
          }}
          className="flex h-12 w-full shrink-0 touch-none flex-col items-center justify-center gap-1 rounded-none text-foreground hover:bg-surface-raised"
        >
          <span className="h-1 w-10 rounded-full bg-muted-foreground/55" aria-hidden />
          <span className="flex w-full items-center justify-between px-4 text-xs font-extrabold uppercase tracking-[0.1em]">
            Explore nearby
            <ChevronDown className={`size-4 text-signal transition-transform ${drawerOpen ? "rotate-180" : ""}`} />
          </span>
        </Button>

        <div className={`min-h-0 overflow-y-auto overscroll-contain px-4 transition-[max-height,opacity] duration-300 ${drawerOpen ? "max-h-[calc(min(68dvh,36rem)-8.75rem)] opacity-100" : "pointer-events-none max-h-0 opacity-0"}`}>
          <div className="border-t border-border pb-3 pt-3">
            <div className="mb-2 flex items-center gap-2">
              <History className="size-4 text-signal" aria-hidden />
              <h2 className="text-xs font-extrabold uppercase tracking-[0.1em] text-foreground">Recent searches</h2>
            </div>
            {recentPlaces.length > 0 ? (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {recentPlaces.map((place) => (
                  <Button
                    key={`${place.formatted}-${place.at}`}
                    type="button"
                    variant="outline"
                    onClick={() => focusPlace(place)}
                    className="h-9 max-w-48 shrink-0 gap-1.5 rounded-full border-border bg-background px-3 text-xs text-foreground"
                  >
                    <MapPin className="size-3.5 shrink-0 text-signal" />
                    <span className="truncate">{place.label}</span>
                  </Button>
                ))}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSearchOpen(true)}
                className="flex h-auto w-full items-center justify-start gap-2 rounded-md border border-dashed border-border bg-background px-3 py-2 text-left text-xs font-normal text-muted-foreground"
              >
                <Search className="size-4 shrink-0 text-signal" />
                Search for a place to build your history.
              </Button>
            )}
          </div>

          <div className="border-t border-border py-3">
            <div className="flex gap-1.5 overflow-x-auto" aria-label="Live map filters">
                {(
                  [
                    ["all", "All"],
                    ["live", "Live now"],
                    ["nearby", `Nearby ${nearby.length}`],
                    ["high", "High bounty"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={mapFilter === key}
                    onClick={() => setMapFilter(key)}
                    className={`h-8 shrink-0 rounded-full border px-3 text-[0.75rem] font-extrabold transition-colors duration-150 ${
                      mapFilter === key
                        ? "border-signal bg-signal text-background shadow-[0_0_0_1px_var(--color-signal)]"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Button>
                ))}
            </div>
            <p className="mt-2 text-[0.75rem] text-muted-foreground" aria-live="polite">
              {mapFilter === "nearby" && !userPosition
                ? `Allow location access to see requests within ${radius} ${unit}.`
                : `${visible.length} ${visible.length === 1 ? "request" : "requests"} shown live`}
            </p>
          </div>

          <div className="border-t border-border py-3">
            <div className="grid grid-cols-3 gap-2" aria-label="Map categories">
              {MAP_CATEGORY_TILES.map((tile) => {
                const Icon = tile.icon;
                const active = categoryTile === tile.id;
                const count = tile.creators
                  ? topCreators.length
                  : tile.guidesLink
                  ? GUIDES.length
                  : (tile.viral ? requests : statusFiltered).filter((request) =>
                      tileMatches(tile, request, userPosition),
                    ).length;
                return (
                  <Button
                    key={tile.id}
                    type="button"
                    variant="outline"
                    aria-pressed={active}
                    onClick={() => {
                      if (tile.communityLink) {
                        void navigate({ to: "/community" });
                        return;
                      }
                      if (tile.guidesLink) {
                        setGuidesOpen(true);
                        return;
                      }
                      setCategoryTile(active ? null : tile.id);
                      setDrawerOpen(true);
                      select(null);
                      setGatheringClusterIds([]);
                    }}
                    className={`relative h-[5.5rem] min-w-0 flex-col gap-1 rounded-md px-1 text-[0.75rem] font-bold ${
                      active
                        ? tile.theme
                          ? tile.theme.active
                          : tile.crisis
                            ? "border-crisis bg-crisis text-crisis-foreground"
                            : "border-signal bg-signal text-signal-foreground"
                        : "border-border bg-background text-foreground"
                    }`}
                  >
                    {tile.theme ? (
                      <span className="text-2xl leading-none" aria-hidden="true">{tile.theme.emoji}</span>
                    ) : (
                      <Icon className={`size-5 ${active ? "text-signal-foreground" : tile.crisis ? "text-crisis" : "text-signal"}`} />
                    )}
                    <span className="w-full truncate">{tile.label}</span>
                    <span className={`absolute right-1.5 top-1.5 text-[0.7rem] font-extrabold ${
                      active
                        ? tile.theme ? "text-current" : "text-signal-foreground"
                        : tile.theme ? tile.theme.badge : "text-muted-foreground"
                    }`}>
                      {count}
                    </span>
                  </Button>
                );
              })}
            </div>

            {activeCategoryTile && !crisisMode && !trafficMode && !gatheringMode && !trendingMode && !viralMode && !creatorsMode && !scannerMode && (
              <div className="mt-3 border-t border-border pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <h2 className="truncate text-sm font-extrabold uppercase tracking-[0.1em] text-foreground">
                    {activeCategoryTile.label} nearby
                  </h2>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setCategoryTile(null)}
                    className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-signal"
                  >
                    Show all
                  </Button>
                </div>
                {visible.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {visible.slice(0, 4).map((request) => (
                      <Button
                        key={request.id}
                        type="button"
                        variant="outline"
                        onClick={() => {
                          select(request.id);
                          setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
                          setDrawerOpen(false);
                        }}
                        className="grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-md border-border bg-background px-3 py-2.5 text-left"
                      >
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                          <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-muted-foreground">
                            {request.place}
                          </span>
                        </span>
                        <span className="shrink-0 text-xs font-extrabold text-signal">
                          {poolOf(request)} cr
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-md border border-dashed border-border bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    No {activeCategoryTile.label.toLowerCase()} bounties match these map filters yet.
                  </p>
                )}
              </div>
            )}

            {trendingMode && (
              <div className="mt-3 border-t border-signal/45 pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-signal">
                      <Flame className="size-3.5" /> Rising within 2 miles
                    </p>
                    <h2 className="mt-1 truncate text-base font-extrabold text-foreground">Trending Near You</h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategoryTile(null)} className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-muted-foreground">
                    Exit
                  </Button>
                </div>

                {!userPosition ? (
                  <p className="mt-3 rounded-md border border-dashed border-signal/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    Allow location access to load fast-rising activity within 2 miles.
                  </p>
                ) : trendingLoading ? (
                  <p className="mt-3 text-center text-xs font-bold text-muted-foreground">Loading nearby activity…</p>
                ) : visible.length + nearbyPosts.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {[...visible]
                      .sort((a, b) => (b.watchers + b.responses) - (a.watchers + a.responses) || a.minutesAgo - b.minutesAgo)
                      .slice(0, 4)
                      .map((request) => {
                        const live = request.bountyType === "live_stream" && request.status === "claimed" && !isClosed(request);
                        return (
                          <Button key={`request-${request.id}`} type="button" variant="outline" onClick={() => {
                            select(request.id);
                            setCenterTarget({ ...requestMapPosition(request), zoom: 16 });
                          }} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-signal/30 bg-background px-3 py-2.5 text-left">
                            {live ? <Radio className="size-4 animate-pulse text-live" /> : <CircleDollarSign className="size-4 text-signal" />}
                            <span className="min-w-0">
                              <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                              <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-muted-foreground">{live ? "Live broadcast" : `${poolOf(request)} credit bounty`} · {request.place}</span>
                            </span>
                            <span className="shrink-0 text-[0.7rem] font-bold text-muted-foreground">{liveTimestamp(request.minutesAgo).replace("Updated ", "")}</span>
                          </Button>
                        );
                      })}
                    {nearbyPosts.slice(0, Math.max(0, 6 - visible.length)).map((post) => (
                      <Button key={`post-${post.id}`} type="button" variant="outline" onClick={() => {
                        if (post.latitude !== null && post.longitude !== null) setCenterTarget({ lat: post.latitude, lng: post.longitude, zoom: 16 });
                      }} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-signal/30 bg-background px-3 py-2.5 text-left">
                        {post.mediaPath && nearbyPostMedia[post.mediaPath]
                          ? <img src={nearbyPostMedia[post.mediaPath]} alt="" className="size-8 rounded object-cover" />
                          : <Image className="size-4 text-signal" />}
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-foreground">{post.title}</span>
                          <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-muted-foreground">Media post · {post.place || "Nearby"}</span>
                        </span>
                        <span className="shrink-0 text-[0.7rem] font-bold text-muted-foreground">{liveTimestamp(Math.max(0, Math.floor((Date.now() - new Date(post.createdAt).getTime()) / 60_000))).replace("Updated ", "")}</span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md border border-dashed border-signal/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    Nothing is rising within 2 miles yet. Check back soon.
                  </p>
                )}
              </div>
            )}

            {viralMode && (
              <div className="mt-3 border-t border-crisis/45 pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-crisis">
                      <Sparkles className="size-3.5" /> Network-wide momentum
                    </p>
                    <h2 className="mt-1 truncate text-base font-extrabold text-foreground">Viral &amp; Breaking</h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategoryTile(null)} className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-muted-foreground">
                    Exit
                  </Button>
                </div>

                {visible.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {[...visible]
                      .sort((a, b) => {
                        const velocity = (request: LiveRequest) => (request.watchers + request.responses) / Math.max(1, request.minutesAgo);
                        return velocity(b) - velocity(a) || (b.watchers + b.responses) - (a.watchers + a.responses);
                      })
                      .slice(0, 4)
                      .map((request) => {
                        const velocity = (request.watchers + request.responses) / Math.max(1, request.minutesAgo);
                        const breaking = isCrisisRequest(request) || (request.minutesAgo <= 15 && velocity >= 1);
                        return (
                          <Button key={`viral-request-${request.id}`} type="button" variant="outline" onClick={() => {
                            select(request.id);
                            setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
                          }} className="grid h-auto w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border-crisis/30 bg-background px-3 py-2.5 text-left">
                            <span className="min-w-0">
                              <span className="flex min-w-0 items-center gap-1.5">
                                {breaking && <span className="shrink-0 rounded-sm bg-crisis px-1.5 py-0.5 text-[0.62rem] font-extrabold uppercase text-crisis-foreground">Breaking</span>}
                                <span className="truncate text-sm font-bold text-foreground">{request.title}</span>
                              </span>
                              <span className="mt-1 block truncate text-[0.75rem] font-normal text-muted-foreground">{request.place} · {request.watchers + request.responses} engagements</span>
                            </span>
                            <span className="flex shrink-0 items-center gap-1 text-[0.72rem] font-extrabold text-crisis">
                              <Eye className="size-3.5" /> +{velocity.toFixed(1)}/min
                            </span>
                          </Button>
                        );
                      })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md border border-dashed border-crisis/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    No network-wide stories are accelerating right now.
                  </p>
                )}
              </div>
            )}

            {scannerMode && (
              <div className="mt-3 border-t border-violet-500/45 pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-violet-400">
                      <Volume2 className="size-3.5" /> Live scanner feed
                    </p>
                    <h2 className="mt-1 truncate text-base font-extrabold text-foreground">Scanner</h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategoryTile(null)} className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-muted-foreground">
                    Exit
                  </Button>
                </div>

                {visible.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {visible.slice(0, 5).map((request) => {
                      const emergency = isCrisisRequest(request);
                      return (
                        <Button key={request.id} type="button" variant="outline" onClick={() => {
                          select(request.id);
                          setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
                        }} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-violet-500/35 bg-background px-3 py-2.5 text-left">
                          <span className={`size-2 rounded-full ${emergency ? "animate-pulse bg-crisis" : "bg-violet-400"}`} />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                            <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-muted-foreground">
                              {emergency ? "Emergency channel" : "Traffic channel"} · {request.place}
                            </span>
                          </span>
                          <span className="flex shrink-0 items-center gap-1 text-[0.7rem] font-bold text-muted-foreground">
                            <Clock3 className="size-3" /> {liveTimestamp(request.minutesAgo).replace("Updated ", "")}
                          </span>
                        </Button>
                      );
                    })}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md border border-dashed border-violet-500/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    No emergency or traffic chatter is hitting the scanner right now.
                  </p>
                )}

                <Button type="button" variant="outline" onClick={() => setScannerNotice(true)} className="mt-2 h-10 w-full justify-center rounded-md border-border bg-background text-sm font-bold text-foreground">
                  <Volume2 className="size-4 text-violet-400" /> Open scanner audio
                </Button>
                {scannerNotice && (
                  <p className="mt-2 text-center text-[0.75rem] text-muted-foreground">
                    No verified public scanner audio is linked to these alerts yet.
                  </p>
                )}
              </div>
            )}

            {creatorsMode && (
              <div className="mt-3 border-t border-signal/45 pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-signal">
                      <Trophy className="size-3.5" /> Network leaderboard
                    </p>
                    <h2 className="mt-1 truncate text-base font-extrabold text-foreground">Top Creators</h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategoryTile(null)} className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-muted-foreground">
                    Exit
                  </Button>
                </div>

                {creatorsLoading ? (
                  <p className="mt-3 text-center text-xs font-bold text-muted-foreground">Loading creator rankings…</p>
                ) : topCreators.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {topCreators.slice(0, 8).map((creator, index) => (
                      <div key={creator.id} className="relative min-w-0 rounded-md border border-border bg-background p-3">
                        <span className="absolute right-2 top-2 text-[0.7rem] font-extrabold text-muted-foreground">#{index + 1}</span>
                        <div className="flex items-center gap-2 pr-5">
                          <div className="relative shrink-0">
                            {creator.avatarUrl ? (
                              <img src={creator.avatarUrl} alt="" className="size-9 rounded-full object-cover" />
                            ) : (
                              <span className="grid size-9 place-items-center rounded-full bg-surface-raised text-xs font-extrabold text-signal">
                                {creator.name.slice(0, 2).toUpperCase()}
                              </span>
                            )}
                            {creator.live && <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-live" aria-label="Live now" />}
                          </div>
                          <span className="min-w-0">
                            <span className="flex min-w-0 items-center gap-1">
                              <span className="truncate text-base font-extrabold text-foreground">{creator.name}</span>
                              {creator.verified && <VerifiedBadge className="size-3.5" />}
                            </span>
                            <span className={`mt-0.5 block text-[0.7rem] font-extrabold uppercase ${creator.live ? "text-live" : "text-muted-foreground"}`}>
                              {creator.live ? "Live now" : "Creator"}
                            </span>
                          </span>
                        </div>
                        <div className="mt-2 flex items-center justify-between gap-2 border-t border-border pt-2 text-[0.72rem]">
                          <span className="font-bold text-foreground">{creator.followerCount.toLocaleString()} followers</span>
                          <span className="text-muted-foreground">{creator.totalViews.toLocaleString()} views</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md border border-dashed border-signal/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    Creator rankings will appear as the network grows.
                  </p>
                )}
              </div>
            )}

            {gatheringMode && (
              <div className="mt-3 border-t border-gathering-high/45 pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-gathering-high">
                      <span className="size-2 animate-pulse rounded-full bg-gathering-high" /> Crowd activity
                    </p>
                    <h2 className="mt-1 truncate text-base font-extrabold text-foreground">
                      {gatheringClusterIds.length > 0 ? "Gathering cluster details" : "Public gatherings nearby"}
                    </h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => {
                    setCategoryTile(null);
                    setGatheringClusterIds([]);
                  }} className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-muted-foreground">
                    Exit
                  </Button>
                </div>

                {(() => {
                  const clusterRequests = gatheringClusterIds.length > 0
                    ? visible.filter((request) => gatheringClusterIds.includes(request.id))
                    : visible;
                  const headcount = clusterRequests.reduce((sum, request) => sum + request.watchers + request.responses, 0);
                  const liveStreams = clusterRequests.filter((request) => request.bountyType === "live_stream" && request.status === "claimed" && !isClosed(request));
                  return (
                    <>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        <div className="rounded-md border border-gathering-low/35 bg-background px-3 py-2">
                          <p className="text-[0.7rem] font-bold uppercase text-muted-foreground">Estimated headcount</p>
                          <p className="mt-0.5 text-lg font-extrabold tabular-nums text-gathering-high">{headcount}</p>
                        </div>
                        <div className="rounded-md border border-gathering-low/35 bg-background px-3 py-2">
                          <p className="text-[0.7rem] font-bold uppercase text-muted-foreground">Live onlookers</p>
                          <p className="mt-0.5 text-lg font-extrabold tabular-nums text-gathering-high">{liveStreams.length}</p>
                        </div>
                      </div>

                      {clusterRequests.length > 0 ? (
                        <div className="mt-2 space-y-2">
                          {clusterRequests.slice(0, 5).map((request) => {
                            const live = request.bountyType === "live_stream" && request.status === "claimed" && !isClosed(request);
                            return (
                              <Button key={request.id} type="button" variant="outline" onClick={() => {
                                select(request.id);
                                setCenterTarget({ ...requestMapPosition(request), zoom: 16 });
                              }} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-gathering-low/35 bg-background px-3 py-2.5 text-left">
                                <MapPin className="size-4 text-gathering-high" />
                                <span className="min-w-0">
                                  <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                                  <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-muted-foreground">{request.place} · {request.watchers + request.responses} people</span>
                                </span>
                                <span className={`flex shrink-0 items-center gap-1 text-[0.7rem] font-extrabold uppercase ${live ? "text-live" : "text-muted-foreground"}`}>
                                  <Eye className="size-3" /> {live ? "Live" : liveTimestamp(request.minutesAgo).replace("Updated ", "")}
                                </span>
                              </Button>
                            );
                          })}
                        </div>
                      ) : (
                        <p className="mt-3 rounded-md border border-dashed border-gathering-low/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                          No public gatherings are active in this area.
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {trafficMode && (
              <div className="mt-3 border-t border-traffic-heavy/45 pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-traffic-heavy">
                      <span className="size-2 animate-pulse rounded-full bg-traffic-heavy" /> Live road conditions
                    </p>
                    <h2 className="mt-1 truncate text-base font-extrabold text-foreground">Traffic incidents &amp; closures</h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategoryTile(null)} className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-muted-foreground">
                    Exit
                  </Button>
                </div>

                <div className="mt-2 flex items-center gap-3 text-[0.72rem] font-bold text-muted-foreground">
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-traffic-slow" /> Slow</span>
                  <span className="flex items-center gap-1"><span className="size-2.5 rounded-full bg-traffic-heavy" /> Heavy</span>
                </div>

                {visible.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {visible.slice(0, 5).map((request) => (
                      <Button key={request.id} type="button" variant="outline" onClick={() => {
                        select(request.id);
                        setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
                        setDrawerOpen(false);
                      }} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-traffic-slow/35 bg-background px-3 py-2.5 text-left">
                        <span className={`size-2.5 rounded-full ${request.minutesAgo <= 15 ? "bg-traffic-heavy" : "bg-traffic-slow"}`} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                          <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-muted-foreground">{trafficIncidentType(request)} · {request.place}</span>
                        </span>
                        <span className="flex shrink-0 items-center gap-1 text-[0.7rem] font-bold text-muted-foreground">
                          <Clock3 className="size-3" /> {liveTimestamp(request.minutesAgo).replace("Updated ", "")}
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-3 rounded-md border border-dashed border-traffic-slow/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    No vehicle incidents or road closures are reported in this area.
                  </p>
                )}
              </div>
            )}

            {crisisMode && (
              <div className="mt-3 border-t border-crisis/45 pt-3" aria-live="polite">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-extrabold uppercase tracking-[0.12em] text-crisis">
                      <span className="size-2 animate-pulse rounded-full bg-crisis" /> Crisis watch
                    </p>
                    <h2 className="mt-1 truncate text-base font-extrabold text-foreground">Live crisis streams</h2>
                  </div>
                  <Button type="button" variant="ghost" size="sm" onClick={() => setCategoryTile(null)} className="h-7 shrink-0 px-2 text-[0.75rem] font-bold text-muted-foreground">
                    Exit
                  </Button>
                </div>

                {visible.length > 0 ? (
                  <div className="mt-2 space-y-2">
                    {visible.slice(0, 4).map((request) => (
                      <Button key={request.id} type="button" variant="outline" onClick={() => {
                        select(request.id);
                        setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
                        setDrawerOpen(false);
                      }} className="grid h-auto w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md border-crisis/45 bg-background px-3 py-2.5 text-left">
                        <span className="size-2 animate-pulse rounded-full bg-crisis" />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                          <span className="mt-0.5 block truncate text-[0.75rem] font-normal text-muted-foreground">{request.place}</span>
                        </span>
                        <span className="shrink-0 text-[0.72rem] font-extrabold uppercase text-crisis">
                          {request.bountyType === "live_stream" && request.status === "claimed" ? "Live" : "Alert"}
                        </span>
                      </Button>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 rounded-md border border-dashed border-crisis/45 bg-background px-3 py-3 text-center text-xs text-muted-foreground">
                    No active crisis streams are reported in this area.
                  </p>
                )}

                <Button type="button" variant="outline" onClick={() => setScannerNotice(true)} className="mt-2 h-10 w-full justify-center rounded-md border-border bg-background text-sm font-bold text-foreground">
                  <Volume2 className="size-4 text-crisis" /> Emergency scanner audio
                </Button>
                {scannerNotice && (
                  <p className="mt-2 text-center text-[0.75rem] text-muted-foreground">
                    No verified public scanner audio is linked to these alerts yet.
                  </p>
                )}
                <div className="mt-3">
                  <FlashBountyButton variant="crisis" />
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-border py-3">
            {[
              { label: "Bounty map", icon: Map, action: () => setMapFilter("all") },
              { label: "Community", icon: Users, action: () => void navigate({ to: "/community" }) },
              { label: "Guides", icon: BookOpen, action: () => setGuidesOpen(true) },
              { label: "Go live", icon: Radio, action: () => void navigate({ to: "/hunt" }) },
            ].map(({ label, icon: Icon, action }) => (
              <Button
                key={label}
                type="button"
                variant="outline"
                onClick={action}
                className="h-16 min-w-0 flex-col gap-1 rounded-md border-border bg-background px-1 text-[0.75rem] font-bold text-foreground"
              >
                <Icon className="size-4 text-signal" />
                <span className="w-full truncate">{label}</span>
              </Button>
            ))}
          </div>
        </div>

        <div className="shrink-0 border-t border-border bg-surface px-4 py-3">
          <Button
            type="button"
            onClick={() => void navigate({ to: "/post" })}
            className="h-12 w-full justify-center rounded-md bg-signal px-4 text-signal-foreground shadow-[0_0_24px_0_color-mix(in_oklab,var(--color-signal)_38%,transparent)] transition-colors hover:bg-signal/90"
          >
            <CircleDollarSign className="size-5" />
            <span className="text-sm font-extrabold uppercase tracking-[0.08em]">Post a Bounty</span>
          </Button>
        </div>
      </section>


      <BountyBottomSheet
        request={selected}
        pool={selected ? poolOf(selected) : 0}
        distanceLabel={
          selected && userPosition
            ? formatDistance(distanceMiles(userPosition, requestMapPosition(selected)))
            : undefined
        }
        onClaim={claim}
        onClose={() => select(null)}
      />

      <GuidesOverlay open={guidesOpen} onClose={() => setGuidesOpen(false)} />
    </div>
  );
}

const GUIDES: Array<{
  icon: typeof Compass;
  kicker: string;
  title: string;
  body: string;
  points: string[];
}> = [
  {
    icon: Compass,
    kicker: "Platform guide",
    title: "How Onlooker works",
    body: "Ever wished you could see a place right now? Someone out there is already standing in it. That's the whole idea.",
    points: [
      "Post a bounty, pick the spot and say what you'd love to see.",
      "Your credits stay safely held until your capture actually arrives.",
      "Every pin on the map is a real request from a real person, right now.",
    ],
  },
  {
    icon: Sparkles,
    kicker: "Hunter onboarding",
    title: "Earn your first bounty",
    body: "See a request near you? Claim it, film a quick live capture, and the money lands the moment it's accepted.",
    points: [
      "Verify your phone first, it shows people you're a real human.",
      "Only claim what you can genuinely reach in time. No rushing needed.",
      "A clear, steady capture builds trust, and brings repeat requests.",
    ],
  },
  {
    icon: Video,
    kicker: "Live streaming",
    title: "Streaming people stick around for",
    body: "Nobody expects a film crew. Steady hands, decent light and a little chatter go a surprisingly long way.",
    points: [
      "Hold your phone with both hands and pan slowly, let people take the scene in.",
      "Say where you are out loud; it helps everyone find their bearings.",
      "Answer the chat. That's the fun part, and it's exactly what viewers are here for.",
    ],
  },
  {
    icon: ShieldCheck,
    kicker: "Safety",
    title: "Stay safe out there",
    body: "Public places only, always. No bounty is ever worth putting yourself, or anyone else, in a tricky spot.",
    points: [
      "Skip private homes, gated property and anywhere you're not meant to be.",
      "Leave live shows, performances and games alone, that's someone else's work.",
      "Keep chats and payments on Onlooker. It's how we've got your back.",
    ],
  },
];

function GuidesOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close guides"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guides-title"
        className="relative flex max-h-[85vh] w-full max-w-lg animate-in slide-in-from-bottom-8 flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl duration-300"
      >
        <div className="flex items-start gap-3 border-b border-border px-4 py-3.5">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-signal" />
          <div className="min-w-0 flex-1">
            <h2 id="guides-title" className="text-base font-extrabold text-foreground">
              Learning &amp; Guides
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A few friendly pointers to help you get the most out of Onlooker.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close guides"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 max-h-[calc(85vh-4.5rem)] flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pt-4 [-webkit-overflow-scrolling:touch] pb-[calc(env(safe-area-inset-bottom)+3rem)]">
          {GUIDES.map(({ icon: Icon, kicker, title, body, points }) => (
            <article key={title} className="rounded-xl border border-border bg-surface-raised/70 p-4">
              <p className="flex items-center gap-2 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-signal">
                <Icon className="size-3.5" /> {kicker}
              </p>
              <h3 className="mt-1.5 text-sm font-extrabold text-foreground">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
              <ul className="mt-2.5 space-y-1.5">
                {points.map((point) => (
                  <li key={point} className="flex gap-2 text-xs text-foreground/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
