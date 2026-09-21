// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Map,
  Maximize2,
  Minimize2,
  Satellite,
  Search,
  X,
} from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { HIDE_LABELS_MAP_STYLE } from "@/lib/map-style";
import { BountyBottomSheet } from "@/components/BountyBottomSheet";
import { isGoldBounty } from "@/lib/bounty-tiers";
import { useBoosts } from "@/lib/boosts-store";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import {
  distanceMiles,
  requestMapPosition,
  type LiveRequest,
  type MapPosition,
} from "@/lib/onlooker";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import type { GeocodeResult } from "@/lib/geocode.functions";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { saveMyLocation } from "@/lib/hunter-location";
import { readSessionState, writeSessionState } from "@/lib/session-state";

import { HomeLiveStage } from "@/components/HomeLiveStage";

const CRISIS_TERMS = [
  "accident", "crash", "collision", "emergency", "fire", "flood", "hazard", "rescue", "smoke", "storm",
];

function isCrisisRequest(request: LiveRequest) {
  if (request.category !== "community" && request.category !== "weather") return false;
  const text = `${request.title} ${request.note} ${request.instructions ?? ""}`.toLowerCase();
  return CRISIS_TERMS.some((term) => text.includes(term));
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
  const [mapFilter, setMapFilter] = useState<"all" | "live" | "nearby" | "high">("all");
  const [centerTarget, setCenterTarget] = useState<(MapPosition & { zoom?: number }) | null>(null);
  // Full-map mode: the hero tucks away so pins take over the whole screen.
  const [mapExpanded, setMapExpanded] = useState(false);
  // Google labels stay hidden by default on Home; the Labels checkbox opts in.
  const [labelsVisible, setLabelsVisible] = useState(false);
  // Compact app-owned base-map switcher (Satellite = hybrid aerial, Map = roadmap).
  const [homeMapType, setHomeMapType] = useState<"hybrid" | "roadmap">("hybrid");
  // Expandable magnifier search: icon collapses into a place search field.
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchPick = useCallback((place: GeocodeResult) => {
    setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setSearchQuery("");
  }, []);

  const homeStateRestored = useRef(false);

  const { boostOf } = useBoosts();
  const { radiusMiles, formatDistance } = useDistanceUnit(userPosition);

  useEffect(() => {
    const saved = readSessionState<{
      sheetVersion?: number;
      mapFilter?: "all" | "live" | "nearby" | "high";
    }>("onlooker:view:home", {});
    if (saved.sheetVersion === 2 && (saved.mapFilter === "all" || saved.mapFilter === "live" || saved.mapFilter === "nearby" || saved.mapFilter === "high")) {
      setMapFilter(saved.mapFilter);
    }
    homeStateRestored.current = true;
  }, []);

  useEffect(() => {
    if (!homeStateRestored.current) return;
    writeSessionState("onlooker:view:home", { sheetVersion: 2, mapFilter });
  }, [mapFilter]);

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

  const poolOf = useCallback((request: LiveRequest) => request.bounty + boostOf(request.id), [boostOf]);

  // Closest active pin to the viewer, powering the "Hot Spot Near You" ticker card.
  const hotSpotRequest = useMemo(() => {
    if (!userPosition) return null;
    const active = requests.filter((request) => !isClosed(request));
    if (active.length === 0) return null;
    return active.reduce<LiveRequest | null>((closest, request) => {
      if (!closest) return request;
      return distanceMiles(userPosition, requestMapPosition(request)) <
        distanceMiles(userPosition, requestMapPosition(closest))
        ? request
        : closest;
    }, null);
  }, [requests, userPosition]);

  const hotSpotRequests = useMemo(() => {
    if (!userPosition) return [];
    return requests
      .filter((request) => !isClosed(request))
      .sort(
        (a, b) =>
          distanceMiles(userPosition, requestMapPosition(a)) -
          distanceMiles(userPosition, requestMapPosition(b)),
      )
      .slice(0, 12);
  }, [requests, userPosition]);

  // The map filters the live requests immediately without changing the underlying data.
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

  const selected = requests.find((r) => r.id === selectedId) ?? null;
  return (
    <div className="fixed inset-0">
      <MapCanvas
        requests={statusFiltered}
        selectedId={selectedId}
        onSelect={select}
        onUserPositionChange={setUserPosition}
        centerTarget={centerTarget}
        viewportStorageKey="onlooker:map:home"
        mapTypeId={homeMapType}
        showNativeMapTypeControl={false}
        styles={labelsVisible ? undefined : HIDE_LABELS_MAP_STYLE}
      />

      <div className="pointer-events-none absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[65] flex items-center gap-2 md:left-4">
        <button
          type="button"
          onClick={() => setMapExpanded((value) => !value)}
          aria-pressed={mapExpanded}
          aria-label={mapExpanded ? "Exit full map view" : "Expand map to full screen"}
          className="pointer-events-auto grid size-9 shrink-0 place-items-center rounded-full border border-signal/60 bg-surface/90 text-signal shadow-md shadow-signal/20 backdrop-blur-xl transition-colors hover:border-signal hover:brightness-110"
        >
          {mapExpanded ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Maximize2 className="size-4" aria-hidden />
          )}
        </button>
        {searchOpen ? (
          <div className="pointer-events-auto flex w-[15rem] max-w-[calc(100vw-6.75rem)] items-center rounded-full border border-border bg-surface/90 py-0.5 pl-3 pr-1 shadow-md backdrop-blur-xl transition-all duration-300 sm:w-[17rem]">
            <Search className="mr-1.5 size-3.5 shrink-0 text-signal" aria-hidden />
            <PlaceSearchInput
              variant="bare"
              autoFocus
              placeholder="Search places"
              value={searchQuery}
              onQueryChange={setSearchQuery}
              onPick={handleSearchPick}
              className="min-w-0 flex-1"
            />
            <button
              type="button"
              onClick={closeSearch}
              aria-label="Close search"
              className="grid size-7 shrink-0 place-items-center rounded-full text-foreground/70 transition-colors hover:text-signal"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search places"
            className="pointer-events-auto grid size-9 shrink-0 place-items-center rounded-full border border-signal/60 bg-surface/90 text-signal shadow-md shadow-signal/20 backdrop-blur-xl transition-colors hover:border-signal hover:brightness-110"
          >
            <Search className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="pointer-events-auto absolute left-3 top-[calc(env(safe-area-inset-top)+3rem)] z-[65] flex h-8 items-center gap-1 rounded-full border border-border bg-surface/90 pl-1.5 pr-1 shadow-md backdrop-blur-xl md:left-4">
        <label className="flex items-center gap-1" aria-label="Show map labels">
          <input
            type="checkbox"
            checked={labelsVisible}
            onChange={(event) => setLabelsVisible(event.target.checked)}
            className="tap-compact size-3.5 accent-signal"
          />
          <span className="text-[0.5rem] font-extrabold uppercase tracking-[0.06em] text-foreground/80">
            Labels
          </span>
        </label>
        <span className="mx-0.5 h-3.5 w-px bg-border" aria-hidden />
        {/* One switch instead of two chips: shows the view you'll get next. */}
        <button
          type="button"
          onClick={() => setHomeMapType(homeMapType === "hybrid" ? "roadmap" : "hybrid")}
          aria-label={
            homeMapType === "hybrid" ? "Switch to the plain map view" : "Switch to satellite view"
          }
          className="tap-compact flex items-center gap-1 rounded-full bg-signal px-2 py-1 text-[0.5rem] font-extrabold uppercase tracking-[0.06em] text-signal-foreground transition-opacity hover:opacity-90"
        >
          {homeMapType === "hybrid" ? (
            <>
              <Satellite className="size-3" aria-hidden /> Satellite
            </>
          ) : (
            <>
              <Map className="size-3" aria-hidden /> Map
            </>
          )}
        </button>
      </div>


      <header className="pointer-events-none absolute inset-x-0 top-0 z-[60] px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:px-6">
        <div className="pointer-events-auto ml-auto flex w-fit flex-col items-center gap-1 rounded-xl border border-border bg-surface/95 px-2.5 py-2 shadow-lg backdrop-blur-xl md:px-3 md:py-2.5 md:shadow-2xl">
          <img
            src="/icon-192.png"
            alt="Onlooker logo"
            className="size-10 rounded-lg object-cover md:size-12"
          />
          <h1 className="text-xs font-extrabold leading-none tracking-tight text-foreground md:text-sm">
            Onlooker
          </h1>
          <p className="whitespace-nowrap text-[0.55rem] font-bold leading-none text-muted-foreground md:text-[0.6rem]">
            Live eyes, anywhere
          </p>
        </div>
      </header>

      <HomeLiveStage
        requests={requests}
        poolOf={poolOf}
        isCrisis={isCrisisRequest}
        mapExpanded={mapExpanded}
        onExitMap={() => setMapExpanded(false)}
        onGoLive={() => void navigate({ to: "/post", search: { mode: "broadcast" } })}
        onPostBounty={() => void navigate({ to: "/post", search: { mode: "bounty" } })}
        onOpenRequest={(request) => {
          select(request.id);
          setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
        }}
        hotSpot={hotSpotRequest}
        hotSpotRequests={hotSpotRequests}
        onOpenHighBounty={(request) => {
          setMapFilter("high");
          select(request.id);
          setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
        }}
        onOpenLive={(request) => {
          void navigate({ to: "/live/$id", params: { id: request.id } });
        }}
        onOpenEmergency={(request) => {
          setMapFilter("all");
          select(request.id);
          setCenterTarget({ ...requestMapPosition(request), zoom: 16 });
        }}
        onOpenDispatches={() => {
          void navigate({ to: "/hunt" });
        }}
        onOpenHotSpot={(request) => {
          setMapFilter("nearby");
          select(request.id);
          setCenterTarget({ ...requestMapPosition(request), zoom: 14 });
        }}
      />

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
    </div>
  );
}
