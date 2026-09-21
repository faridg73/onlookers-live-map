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
  ): { b?: string | undefined; snap?: string | undefined; at?: string | undefined } => ({
    b: typeof search["b"] === "string" ? search["b"] : undefined,
    snap: search["snap"] === "1" ? "1" : undefined,
    at: typeof search["at"] === "string" ? search["at"] : undefined,
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
  const { b, at } = Route.useSearch();
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

  // Deep links like /?at=34.05,-118.24 (e.g. "View on map" from a capture) center the map there.
  useEffect(() => {
    if (!at) return;
    const [lat, lng] = at.split(",").map((n) => Number.parseFloat(n)) as [number, number];
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      setCenterTarget({ lat, lng, zoom: 16 });
      setMapExpanded(true);
    }
  }, [at]);

  const handleSearchPick = useCallback((place: GeocodeResult) => {
    setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
    setMapExpanded(true);
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

  // Opening a shared bounty link lands straight on that pin: select it so the
  // callout opens, then center and zoom the map onto its exact coordinates.
  const centeredOnBounty = useRef<string | null>(null);
  useEffect(() => {
    if (!b) return;
    select(b);
    if (centeredOnBounty.current === b) return;
    const target = requests.find((r) => r.id === b);
    if (!target) return;
    centeredOnBounty.current = b;
    setCenterTarget({ ...requestMapPosition(target), zoom: 16 });
    setMapExpanded(true);
  }, [b, requests, select]);

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
  // A deep-linked bounty must always show its pin, even if a map filter would hide it.
  const mapRequests = useMemo(() => {
    if (!selected || statusFiltered.some((r) => r.id === selected.id)) return statusFiltered;
    return [...statusFiltered, selected];
  }, [statusFiltered, selected]);
  return (
    <div className="home-marketplace fixed inset-0 overflow-hidden bg-surface">
      {/* Full-bleed immersive canvas: the live map fills the screen edge to edge. */}
      <div className="absolute inset-0 brightness-[0.66] contrast-[1.22] saturate-[0.88]">
        <MapCanvas
          requests={mapRequests}
          selectedId={selectedId}
          onSelect={select}
          onUserPositionChange={setUserPosition}
          centerTarget={centerTarget}
          viewportStorageKey="onlooker:map:home"
          mapTypeId={homeMapType}
          showNativeMapTypeControl={false}
          controlsTopClass="top-[calc(env(safe-area-inset-top,0px)+10rem)] sm:top-[calc(env(safe-area-inset-top,0px)+8.5rem)]"
          styles={labelsVisible ? undefined : HIDE_LABELS_MAP_STYLE}
        />
      </div>
      {!mapExpanded && (
        <div
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_0%,color-mix(in_oklab,var(--color-background)_72%,transparent),transparent_70%)]"
          aria-hidden
        />
      )}

      <div className="pointer-events-none absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] z-[65] flex items-center gap-2 md:left-4">
        <button
          type="button"
          onClick={() => setMapExpanded((value) => !value)}
          aria-pressed={mapExpanded}
          aria-label={mapExpanded ? "Close map view" : "Open live map"}
          className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-xl border border-signal/70 bg-background text-signal shadow-[0_0_16px_color-mix(in_oklab,var(--color-signal)_24%,transparent)] transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-signal hover:bg-signal/10 active:translate-y-0"
        >
          {mapExpanded ? (
            <Minimize2 className="size-4" aria-hidden />
          ) : (
            <Maximize2 className="size-4" aria-hidden />
          )}
        </button>
        {searchOpen ? (
          <div className="pointer-events-auto flex w-[15rem] max-w-[calc(100vw-6.75rem)] items-center rounded-xl border border-home-line bg-home-glass-strong py-0.5 pl-3 pr-1 shadow-xl backdrop-blur-2xl transition-all duration-300 sm:w-[17rem]">
            <Search className="mr-1.5 size-3.5 shrink-0 text-home-accent" aria-hidden />
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
              className="grid size-7 shrink-0 place-items-center rounded-lg text-foreground/70 transition-colors hover:text-home-accent"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            aria-label="Search places"
            className="pointer-events-auto grid size-10 shrink-0 place-items-center rounded-xl border border-home-line bg-home-glass-strong text-home-accent shadow-xl backdrop-blur-2xl transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-home-accent/60 hover:bg-home-glass active:translate-y-0"
          >
            <Search className="size-4" aria-hidden />
          </button>
        )}
      </div>

      <div className="pointer-events-auto absolute left-3 top-[calc(env(safe-area-inset-top)+3.35rem)] z-[65] flex h-8 items-center gap-1 rounded-lg border border-signal/35 bg-home-glass-strong pl-2 pr-1 shadow-xl backdrop-blur-2xl md:left-4">
        <label className="flex items-center gap-1" aria-label="Show map labels">
          <input
            type="checkbox"
            checked={labelsVisible}
            onChange={(event) => setLabelsVisible(event.target.checked)}
            className="tap-compact size-3.5 accent-signal"
          />
          <span className="text-[0.5rem] font-bold uppercase text-foreground/70">
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
          className="tap-compact flex items-center gap-1 rounded-md border border-home-accent/35 bg-home-accent/12 px-2 py-1 text-[0.5rem] font-bold uppercase text-home-accent transition-colors hover:border-home-accent/70 hover:bg-home-accent/20"
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
        <div className="pointer-events-auto ml-auto flex w-fit flex-col items-center gap-1 rounded-2xl border border-home-line bg-home-glass-strong px-2.5 py-2 shadow-2xl backdrop-blur-2xl md:px-3 md:py-2.5">
          <img
            src="/icon-192.png"
            alt="Onlooker logo"
            className="size-10 rounded-lg object-cover md:size-12"
          />
          <h1 className="text-xs font-bold leading-none text-foreground md:text-sm">
            Onlooker
          </h1>
          <p className="whitespace-nowrap text-[0.55rem] font-medium leading-none text-foreground/55 md:text-[0.6rem]">
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
          setMapExpanded(true);
          select(request.id);
          setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
        }}
        hotSpot={hotSpotRequest}
        hotSpotRequests={hotSpotRequests}
        onOpenHighBounty={(request) => {
          setMapExpanded(true);
          setMapFilter("high");
          select(request.id);
          setCenterTarget({ ...requestMapPosition(request), zoom: 15 });
        }}
        onOpenLive={(request) => {
          void navigate({ to: "/live/$id", params: { id: request.id } });
        }}
        onOpenEmergency={(request) => {
          setMapExpanded(true);
          setMapFilter("all");
          select(request.id);
          setCenterTarget({ ...requestMapPosition(request), zoom: 16 });
        }}
        onOpenDispatches={() => {
          void navigate({ to: "/hunt" });
        }}
        onOpenHotSpot={(request) => {
          setMapExpanded(true);
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
