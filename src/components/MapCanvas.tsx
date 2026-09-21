// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from "react";
import { CoinsIcon, LocateFixed, Share2, Star, X } from "lucide-react";
import { shareBounty } from "@/lib/bounty-share";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ExpiryCountdown, HIGH_BOUNTY } from "@/components/ExpiryCountdown";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { bountyTier, categoryGlyph, TIER_LABELS } from "@/lib/bounty-tiers";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { SHARED_MAP_OPTIONS } from "@/lib/map-style";
import { fetchMapAreaPlaces, type DiscoveredPlace } from "@/lib/places.functions";

import { useBoosts } from "@/lib/boosts-store";
import { fetchHunterStats } from "@/lib/gamification";
import { GeolocationFailure, requestCurrentPosition } from "@/lib/geolocation";
import { REGIONAL_CENTER, requestMapPosition, type LiveRequest, type MapPosition } from "@/lib/onlooker";
import { isClosed } from "@/lib/onlooker-store";
import { cn } from "@/lib/utils";
import { readMapViewport, writeSessionState } from "@/lib/session-state";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const DETAIL_ZOOM = 14;
/** Real business names and ratings only load once the map is this close in. */
const PLACE_ZOOM = 15;

type Pixel = { left: number; top: number };

/** Real Google street map with bounty pins drawn on top. */
export function MapCanvas({
  requests,
  selectedId,
  onSelect,
  onUserPositionChange,
  pinMode = false,
  onMapPin,
  draftPin = null,
  centerTarget = null,
  focusPin = null,
  crisisMode = false,
  trafficMode = false,
  gatheringMode = false,
  onGatheringClusterSelect,
  viewportStorageKey,
  mapTypeId,
  styles,
  showNativeMapTypeControl = true,
  /** Vertical position of the app's zoom/locate column; screens with a tall
   *  top-right stack (logo card + menu) push it below that stack. */
  controlsTopClass = "top-[calc(env(safe-area-inset-top,0px)+7.5rem)]",
}: {
  requests: LiveRequest[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUserPositionChange?: (position: MapPosition | null) => void;
  /** While true, tapping anywhere on the world map drops a request pin. */
  pinMode?: boolean;
  onMapPin?: (position: MapPosition) => void;
  /** The pin being funded right now, drawn until it is confirmed or dropped. */
  draftPin?: MapPosition | null;
  /** A place searched for in pin mode; the map flies there when it changes. */
  centerTarget?: (MapPosition & { zoom?: number }) | null;
  /** A chosen location or category area: the map focuses it and pins it. */
  focusPin?: (MapPosition & { zoom?: number; label?: string }) | null;
  /** Emergency mode keeps every crisis request visible as a pulsing red marker. */
  crisisMode?: boolean;
  /** Traffic mode adds Google's live traffic layer and incident heat halos. */
  trafficMode?: boolean;
  /** Public gathering mode shows crowd-density circles behind venue pins. */
  gatheringMode?: boolean;
  onGatheringClusterSelect?: (requestIds: string[]) => void;
  viewportStorageKey?: string;
  /** Optional controlled base-map style for screens with app-owned controls. */
  mapTypeId?: "hybrid" | "satellite" | "roadmap";
  /** Hide Google's control when a screen provides its own compact selector. */
  showNativeMapTypeControl?: boolean;
  /** Tailwind top-position class overriding the default zoom-column offset. */
  controlsTopClass?: string;
  /** Optional Google style array to override the default base-map appearance. */
  styles?: google.maps.MapTypeStyle[] | undefined;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const overlay = useRef<google.maps.OverlayView | null>(null);
  const trafficLayer = useRef<google.maps.TrafficLayer | null>(null);
  
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [zoom, setZoom] = useState(15);
  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [geoState, setGeoState] = useState<"pending" | "located" | "denied" | "unavailable">("pending");
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const { boostOf } = useBoosts();
  const [me, setMe] = useState<{ isIncognito: boolean } | null>(null);
  // Real businesses in the current view, loaded once the map settles close enough.
  const [view, setView] = useState<{ lat: number; lng: number; radius: number; zoom: number } | null>(
    null,
  );
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const restoredViewport = useRef(false);

  // Live values for the map's own click listener, which is registered once.
  const pinModeRef = useRef(pinMode);
  const onMapPinRef = useRef(onMapPin);
  pinModeRef.current = pinMode;
  onMapPinRef.current = onMapPin;


  // Own status tier colours the marker; incognito hides the precise dot.
  useEffect(() => {
    void fetchHunterStats().then((stats) =>
      setMe(stats ? { isIncognito: stats.isIncognito } : null),
    );
  }, []);

  useEffect(() => {
    if (!ready || !map.current) return;
    if (trafficMode) {
      trafficLayer.current ??= new google.maps.TrafficLayer();
      trafficLayer.current.setMap(map.current);
    } else {
      trafficLayer.current?.setMap(null);
    }
    return () => trafficLayer.current?.setMap(null);
  }, [ready, trafficMode]);

  // Boot the map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        const savedViewport = readMapViewport(viewportStorageKey);
        restoredViewport.current = Boolean(savedViewport);
        map.current = new maps.Map(holder.current, {
          ...SHARED_MAP_OPTIONS,
          mapTypeId: mapTypeId ?? SHARED_MAP_OPTIONS.mapTypeId ?? "hybrid",
          mapTypeControl: showNativeMapTypeControl,
          styles: styles ?? null,
          center: savedViewport ? { lat: savedViewport.lat, lng: savedViewport.lng } : REGIONAL_CENTER,
          // Neighborhood-level default keeps aerial detail and hybrid labels
          // legible while preserving the existing nearby marker density.
          zoom: savedViewport?.zoom ?? 15,
          // Zoom out far enough to reach any country, so a pin can be dropped
          // anywhere in the world.
          minZoom: 2,
        });
        const ov = new maps.OverlayView();
        ov.onAdd = () => {};
        ov.onRemove = () => {};
        ov.draw = () => setTick((t) => t + 1);
        ov.setMap(map.current);
        overlay.current = ov;
        map.current.addListener("bounds_changed", () => setTick((t) => t + 1));
        map.current.addListener("zoom_changed", () => {
          const nextZoom = map.current?.getZoom();
          if (typeof nextZoom !== "number") return;
          setZoom(nextZoom);
        });
        // Once the map settles, note the area on screen so real place data can load.
        map.current.addListener("idle", () => {
          const current = map.current;
          const centre = current?.getCenter();
          const bounds = current?.getBounds();
          const currentZoom = current?.getZoom();
          if (!centre || !bounds || typeof currentZoom !== "number") return;
          const ne = bounds.getNorthEast();
          // Rough metre distance from the centre to a corner of the view.
          const latMetres = (ne.lat() - centre.lat()) * 111320;
          const lngMetres =
            (ne.lng() - centre.lng()) * 111320 * Math.cos((centre.lat() * Math.PI) / 180);
          const radius = Math.round(Math.hypot(latMetres, lngMetres));
          setView({
            lat: Number(centre.lat().toFixed(4)),
            lng: Number(centre.lng().toFixed(4)),
            radius: clamp(radius || 1200, 200, 5000),
            zoom: currentZoom,
          });
          if (viewportStorageKey) {
            writeSessionState(viewportStorageKey, {
              lat: centre.lat(),
              lng: centre.lng(),
              zoom: currentZoom,
            });
          }
        });
        map.current.addListener("click", (event: google.maps.MapMouseEvent) => {
          const at = event.latLng;
          if (pinModeRef.current && at) {
            onMapPinRef.current?.({ lat: at.lat(), lng: at.lng() });
            return;
          }
          setActivePlaceId(null);
          onSelect(null);
        });
        setReady(true);
      })
      .catch((error) => {
        console.error("[Onlooker map] Google Maps failed to load", error);
        setFailed(true);
      });
    return () => {
      cancelled = true;
      overlay.current?.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewportStorageKey]);


  useEffect(() => {
    if (!ready || !map.current || !mapTypeId) return;
    map.current.setMapTypeId(mapTypeId);
  }, [mapTypeId, ready]);

  // Keep the base-map style in sync so screens with a labels toggle can
  // flip Google's label layers on and off after the map has booted.
  useEffect(() => {
    if (!ready || !map.current) return;
    map.current.setOptions({ styles: styles ?? null });
  }, [ready, styles]);

  /** Position waiting for the map to finish loading. */
  const pendingCenter = useRef<google.maps.LatLngLiteral | null>(null);

  const centerOn = useCallback((at: google.maps.LatLngLiteral) => {
    if (!map.current) {
      pendingCenter.current = at;
      return;
    }
    map.current.setCenter(at);
    const z = map.current.getZoom();
    if (typeof z !== "number" || z < 15) map.current.setZoom(15);
  }, []);

  /** Ask the device for its precise position and center the map on it. */
  const locateMe = useCallback(async () => {
    setGeoState("pending");
    setGeoMessage(null);
    try {
      const pos = await requestCurrentPosition();
      const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
      setUserPos(at);
      onUserPositionChange?.(at);
      setGeoState("located");
      centerOn(at);
    } catch (error) {
      const denied = error instanceof GeolocationFailure && error.code === "denied";
      setGeoState(denied ? "denied" : "unavailable");
      setGeoMessage(
        error instanceof Error ? error.message : "Your location could not be found. Try again.",
      );
      onUserPositionChange?.(null);
    }
  }, [onUserPositionChange, centerOn]);

  useEffect(() => {
    if (restoredViewport.current) return;
    locateMe();
  }, [locateMe]);

  // If the fix arrived before the map booted, apply it as soon as it's ready.
  useEffect(() => {
    if (ready && pendingCenter.current) {
      const at = pendingCenter.current;
      pendingCenter.current = null;
      centerOn(at);
    }
  }, [ready, centerOn]);


  const toPixel = (position: google.maps.LatLngLiteral): Pixel | null => {
    const projection = overlay.current?.getProjection();
    if (!projection) return null;
    const point = projection.fromLatLngToContainerPixel(
      new google.maps.LatLng(position.lat, position.lng),
    );
    return point ? { left: point.x, top: point.y } : null;
  };

  const zoomBy = (delta: number) => {
    const z = map.current?.getZoom();
    if (typeof z === "number") map.current?.setZoom(clamp(z + delta, 2, 20));
  };

  // Searching for a place in pin mode flies the map there.
  useEffect(() => {
    if (!ready || !centerTarget || !map.current) return;
    map.current.setCenter({ lat: centerTarget.lat, lng: centerTarget.lng });
    map.current.setZoom(centerTarget.zoom ?? 14);
  }, [ready, centerTarget]);

  // A chosen place or category area: fly there and keep its own labelled pin.
  useEffect(() => {
    if (!ready || !focusPin || !map.current) return;
    map.current.panTo({ lat: focusPin.lat, lng: focusPin.lng });
    const current = map.current.getZoom() ?? 0;
    if (current < (focusPin.zoom ?? 15)) map.current.setZoom(focusPin.zoom ?? 15);
  }, [ready, focusPin]);

  /**
   * Real businesses for the settled view: names, ratings and addresses straight
   * from Google Places. Only fetched close in, and debounced, to stay cheap.
   */
  const placeKey = view && view.zoom >= PLACE_ZOOM ? `${view.lat}:${view.lng}:${view.radius}` : "";
  useEffect(() => {
    if (!placeKey || !view) {
      setPlaces([]);
      setActivePlaceId(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      void fetchMapAreaPlaces({
        data: { latitude: view.lat, longitude: view.lng, radiusMeters: view.radius },
      })
        .then((result) => {
          if (!cancelled) setPlaces(result);
        })
        .catch(() => {
          if (!cancelled) setPlaces([]);
        });
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [placeKey]);


  // `tick` re-runs pixel math whenever the map moves.
  void tick;
  const userPixel = ready && userPos ? toPixel(userPos) : null;
  const draftPixel = ready && draftPin ? toPixel(draftPin) : null;
  const focusPixel = ready && focusPin ? toPixel(focusPin) : null;
  const activePlace = places.find((place) => place.id === activePlaceId) ?? null;
  const requestMarkers = ready
    ? requests.flatMap((request) => {
        const pixel = toPixel(requestMapPosition(request));
        return pixel ? [{ request, pixel }] : [];
      })
    : [];
  const showAllRequests = crisisMode || trafficMode || gatheringMode || zoom >= DETAIL_ZOOM;
  const importantMarkers = showAllRequests
    ? requestMarkers
    : requestMarkers.filter(({ request }) => {
        const total = request.bounty + boostOf(request.id);
        const activeLive =
          request.bountyType === "live_stream" &&
          request.status === "claimed" &&
          !isClosed(request);
        return (
          request.id === selectedId ||
          activeLive ||
          request.bountyTier === "priority_hunt" ||
          bountyTier(total) === "gold"
        );
      });
  const importantIds = new Set(importantMarkers.map(({ request }) => request.id));
  const clusterGrid = zoom <= 7 ? 150 : zoom <= 10 ? 120 : 96;
  const ordinaryClusters = showAllRequests
    ? []
    : Array.from(
        requestMarkers
          .filter(({ request }) => !importantIds.has(request.id) && !isClosed(request))
          .reduce(
            (groups, marker) => {
              const key = `${Math.floor(marker.pixel.left / clusterGrid)}:${Math.floor(marker.pixel.top / clusterGrid)}`;
              const group = groups.get(key) ?? [];
              group.push(marker);
              groups.set(key, group);
              return groups;
            },
            new Map<string, typeof requestMarkers>(),
          )
          .values(),
      ).map((members) => {
        const positions = members.map(({ request }) => requestMapPosition(request));
        return {
          id: members.map(({ request }) => request.id).sort().join(":"),
          count: members.length,
          center: {
            lat: positions.reduce((sum, position) => sum + position.lat, 0) / positions.length,
            lng: positions.reduce((sum, position) => sum + position.lng, 0) / positions.length,
          },
          pixel: {
            left: members.reduce((sum, marker) => sum + marker.pixel.left, 0) / members.length,
            top: members.reduce((sum, marker) => sum + marker.pixel.top, 0) / members.length,
          },
        };
      });

  const gatheringGrid = zoom <= 10 ? 180 : 130;
  const gatheringClusters = !gatheringMode
    ? []
    : Array.from(
        requestMarkers.reduce(
          (groups, marker) => {
            const key = `${Math.floor(marker.pixel.left / gatheringGrid)}:${Math.floor(marker.pixel.top / gatheringGrid)}`;
            const group = groups.get(key) ?? [];
            group.push(marker);
            groups.set(key, group);
            return groups;
          },
          new Map<string, typeof requestMarkers>(),
        ).values(),
      ).map((members) => ({
        id: members.map(({ request }) => request.id).sort().join(":"),
        requestIds: members.map(({ request }) => request.id),
        headcount: members.reduce((sum, { request }) => sum + request.watchers + request.responses, 0),
        pixel: {
          left: members.reduce((sum, marker) => sum + marker.pixel.left, 0) / members.length,
          top: members.reduce((sum, marker) => sum + marker.pixel.top, 0) / members.length,
        },
      }));

  // Business pins removed per request — the map shows no location pins.

  return (
    <div className="absolute inset-0 overflow-hidden bg-map">
      <div
        ref={holder}
        className="absolute inset-0"
        style={{ touchAction: "none", cursor: pinMode ? "crosshair" : "grab" }}
      />

      {/* the pin being funded right now */}
      {draftPixel && (
        <span
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-full"
          style={{ left: draftPixel.left, top: draftPixel.top }}
          aria-label="Pin you are funding"
        >
          <span className="flex flex-col items-center">
            <span className="rounded-full bg-signal px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-signal-foreground shadow-lg">
              Your pin
            </span>
            <span className="mt-0.5 size-2 rotate-45 bg-signal" />
          </span>
        </span>
      )}

      {/* the place or area the viewer chose */}
      {focusPixel && (
        <span
          className="pointer-events-none absolute z-[5] -translate-x-1/2 -translate-y-full"
          style={{ left: focusPixel.left, top: focusPixel.top }}
          aria-label={focusPin?.label ? `Chosen spot: ${focusPin.label}` : "Chosen spot"}
        >
          <span className="flex flex-col items-center">
            <span className="max-w-[11rem] truncate rounded-full border border-signal bg-black/85 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-signal shadow-lg shadow-signal/30 backdrop-blur-md">
              {focusPin?.label ?? "Chosen spot"}
            </span>
            <span className="mt-0.5 size-2.5 rotate-45 border border-signal bg-signal" />
            <span className="mt-1 size-2 rounded-full bg-signal/50 blur-[2px]" />
          </span>
        </span>
      )}

      {failed && (
        <div className="absolute inset-0 flex items-center justify-center px-6 text-center">
          <p className="text-sm font-semibold text-muted-foreground">
            The map couldn&apos;t load right now. Pull to refresh or try again shortly.
          </p>
        </div>
      )}

      {/* you-are-here marker */}
      {userPixel && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: userPixel.left, top: userPixel.top }}
          aria-label="Your location"
        >
          {me?.isIncognito ? (
            <span className="flex flex-col items-center">
              <span className="size-24 rounded-full border-2 border-dashed border-signal/60 bg-signal/10" />
              <span className="-mt-14 rounded-full bg-surface/90 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.12em] text-foreground backdrop-blur">
                En route
              </span>
            </span>
          ) : (
            <span className="relative flex size-5 items-center justify-center">
              <span className="absolute inset-0 animate-ping-slow rounded-full bg-live/40" />
              <span className="size-3.5 rounded-full border-2 border-foreground/80 bg-cyan shadow-lg" />
            </span>
          )}
        </div>
      )}

      {/* Details for the tapped business. */}
      {activePlace && (
        <div className="absolute left-3 right-20 z-40 max-w-xs rounded-lg border border-border bg-surface/95 p-3 shadow-2xl backdrop-blur-xl top-[calc(env(safe-area-inset-top,0px)+7.5rem)]">
          <div className="flex items-start gap-2">
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-extrabold text-foreground">
                {activePlace.name}
              </p>
              {activePlace.primaryType && (
                <p className="mt-0.5 truncate text-[0.62rem] font-bold uppercase tracking-[0.08em] text-signal">
                  {activePlace.primaryType}
                </p>
              )}
              {activePlace.rating !== null && (
                <p className="mt-1 flex items-center gap-1 text-[0.68rem] font-bold text-foreground">
                  <Star className="size-3 text-signal" aria-hidden />
                  {activePlace.rating.toFixed(1)}
                  {activePlace.ratingCount !== null && (
                    <span className="font-medium text-muted-foreground">
                      ({activePlace.ratingCount} reviews)
                    </span>
                  )}
                </p>
              )}
              {activePlace.address && (
                <p className="mt-1 text-[0.66rem] leading-snug text-muted-foreground">
                  {activePlace.address}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setActivePlaceId(null)}
              aria-label="Close place details"
              className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm hover:bg-secondary"
            >
              <X className="size-4" />
            </button>
          </div>
        </div>
      )}





      {/* Ordinary requests collapse into compact clusters until the map is close enough. */}
      {ordinaryClusters.map((cluster) => (
        <button
          key={cluster.id}
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            map.current?.setCenter(cluster.center);
            map.current?.setZoom(Math.min(DETAIL_ZOOM, Math.max(zoom + 2, 10)));
          }}
          className="absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-black bg-signal font-display text-xs font-extrabold tabular-nums text-signal-foreground shadow-lg shadow-black/40 transition-transform hover:scale-105"
          style={{ left: cluster.pixel.left, top: cluster.pixel.top }}
          aria-label={`${cluster.count} nearby ${cluster.count === 1 ? "request" : "requests"}. Zoom in to view.`}
          title="Zoom in to view nearby requests"
        >
          {cluster.count}
        </button>
      ))}

      {gatheringClusters.map((cluster) => {
        const diameter = Math.min(132, 64 + Math.sqrt(Math.max(cluster.headcount, 1)) * 7);
        const busy = cluster.headcount >= 20;
        return (
          <button
            key={`gathering-${cluster.id}`}
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onGatheringClusterSelect?.(cluster.requestIds);
            }}
            className={`absolute z-10 grid -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 backdrop-blur-[1px] transition-transform hover:scale-105 ${busy ? "border-gathering-high/80 bg-gathering-high/30" : "border-gathering-low/80 bg-gathering-low/25"}`}
            style={{ left: cluster.pixel.left, top: cluster.pixel.top, width: diameter, height: diameter }}
            aria-label={`Public gathering cluster, estimated headcount ${cluster.headcount}. Open details.`}
          >
            <span className={`grid size-9 place-items-center rounded-full text-[0.65rem] font-extrabold text-background shadow-lg ${busy ? "bg-gathering-high" : "bg-gathering-low"}`}>
              {cluster.headcount}
            </span>
          </button>
        );
      })}

      {/* Important pins stay visible; all individual pins return at close zoom. */}
      {importantMarkers.map(({ request: r, pixel }) => {
          const isSel = r.id === selectedId;
          const pooled = boostOf(r.id);
          const pool = r.bounty + pooled;
          const tier = bountyTier(pool);
          const closed = isClosed(r);

          return (
            <button
              key={r.id}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onSelect(isSel ? null : r.id);
              }}
              className="absolute -translate-x-1/2 -translate-y-full"
              style={{ left: pixel.left, top: pixel.top }}
              aria-label={`${TIER_LABELS[tier]}: ${pool} credits at ${r.place}`}
            >
              <span className="relative flex flex-col items-center">
                {gatheringMode && !closed && (
                  <span className="absolute bottom-0 size-14 rounded-full border-2 border-gathering-high/70 bg-gathering-low/20" />
                )}
                {trafficMode && !closed && (
                  <>
                    <span className={`absolute bottom-0 size-24 animate-ping-slow rounded-full motion-reduce:animate-none ${r.minutesAgo <= 15 ? "bg-traffic-heavy/35" : "bg-traffic-slow/30"}`} />
                    <span className={`absolute bottom-1 size-16 rounded-full border-2 ${r.minutesAgo <= 15 ? "border-traffic-heavy/80" : "border-traffic-slow/80"}`} />
                  </>
                )}
                {crisisMode && !closed && (
                  <>
                    <span className="absolute bottom-0 size-20 animate-ping-slow rounded-full bg-crisis/35 motion-reduce:animate-none" />
                    <span className="absolute bottom-1 size-14 rounded-full border-2 border-crisis/80" />
                  </>
                )}
                {/* bounties running out of time pulse hard so they can't be missed */}
                {!crisisMode && !closed && r.status === "open" && r.expiresInMin <= 20 && (
                  <>
                    <span
                      className="absolute bottom-0 size-20 animate-ping-slow rounded-full motion-reduce:animate-none"
                      style={{ backgroundColor: "color-mix(in oklch, var(--urgent) 30%, transparent)" }}
                    />
                    <span
                      className="absolute bottom-1 size-14 rounded-full border-2"
                      style={{ borderColor: "color-mix(in oklch, var(--urgent) 70%, transparent)" }}
                    />
                  </>
                )}
                {/* gold pins keep a soft pulsing halo ring */}
                {!crisisMode && tier === "gold" && !closed && (
                  <>
                    <span
                      className="absolute bottom-0 size-16 animate-ping-slow rounded-full"
                      style={{ backgroundColor: "color-mix(in oklch, var(--pin-gold) 28%, transparent)" }}
                    />
                    <span
                      className="absolute bottom-1 size-12 rounded-full border-2"
                      style={{ borderColor: "color-mix(in oklch, var(--pin-gold) 65%, transparent)" }}
                    />
                  </>
                )}
                {!crisisMode && tier === "medium" && r.status === "open" && (
                  <span
                    className="absolute bottom-0 size-9 animate-ping-slow rounded-full"
                    style={{ backgroundColor: "color-mix(in oklch, var(--pin-medium) 22%, transparent)" }}
                  />
                )}

                {tier !== "standard" && !closed && (
                  <span className="mb-1">
                    <CategoryBadge category={r.category} compact />
                  </span>
                )}

                {gatheringMode ? (
                  <span className="relative grid size-10 place-items-center rounded-full border-2 border-gathering-high bg-surface text-base shadow-lg" aria-hidden>
                    {categoryGlyph(r.category)}
                  </span>
                ) : trafficMode ? (
                  <span className={`relative grid size-11 place-items-center rounded-full border-2 text-sm font-black text-background shadow-lg ${r.minutesAgo <= 15 ? "border-traffic-heavy bg-traffic-heavy" : "border-traffic-slow bg-traffic-slow"}`}>
                    {categoryGlyph(r.category)}
                  </span>
                ) : crisisMode ? (
                  <span className="relative grid size-11 place-items-center rounded-full border-2 border-crisis bg-crisis text-crisis-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--color-crisis)_65%,transparent)]">
                    <span className="text-lg" aria-hidden>!</span>
                    <span className="sr-only">Crisis</span>
                  </span>
                ) : tier === "standard" ? (
                  /* lemon-green pin with a plain category glyph */
                  <span
                    className={cn(
                      "relative flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold shadow",
                      closed
                        ? "border-border bg-surface text-muted-foreground"
                        : "border-black/70 bg-signal text-signal-foreground",
                    )}
                  >
                    <span aria-hidden>{categoryGlyph(r.category)}</span>
                    {isSel && <span className="tabular-nums">{r.place.slice(0, 12)}</span>}
                  </span>
                ) : (
                  <span
                    className={cn(
                      "relative flex items-center gap-1.5 rounded-full border-2 font-display font-extrabold tracking-tight tabular-nums shadow-lg",
                      tier === "gold" ? "px-4 py-2 text-xl" : "px-3 py-1.5 text-base",
                      closed && "border-border bg-surface text-muted-foreground",
                    )}
                    style={
                      closed
                        ? undefined
                        : tier === "gold"
                          ? {
                              borderColor: "color-mix(in oklch, var(--pin-gold) 75%, black)",
                              backgroundColor: "var(--pin-gold)",
                              color: "oklch(0.2 0.03 92)",
                              boxShadow: "0 0 26px -4px color-mix(in oklch, var(--pin-gold) 70%, transparent)",
                            }
                          : {
                              borderColor: "color-mix(in oklch, var(--pin-medium) 70%, black)",
                              backgroundColor: isSel
                                ? "var(--pin-medium)"
                                : "color-mix(in oklch, var(--pin-medium) 18%, var(--surface))",
                              color: isSel ? "oklch(0.2 0.03 55)" : "var(--pin-medium)",
                            }
                    }
                  >
                    {/* silver credit for medium bounties, gold credit badge for gold */}
                    <span
                      className={cn(
                        "flex items-center justify-center rounded-full border",
                        tier === "gold"
                          ? "absolute -right-2 -top-2 size-7 animate-pulse shadow-lg"
                          : "size-4",
                      )}
                      style={{
                        borderColor:
                          tier === "gold"
                            ? "oklch(0.45 0.09 92)"
                            : "color-mix(in oklch, var(--pin-silver) 60%, black)",
                        backgroundColor:
                          tier === "gold" ? "var(--pin-gold)" : "var(--pin-silver)",
                        color: tier === "gold" ? "oklch(0.28 0.06 92)" : "oklch(0.3 0.01 260)",
                      }}
                      aria-hidden
                    >
                      <CoinsIcon className={tier === "gold" ? "size-4" : "size-2.5"} />
                    </span>
                    {pool}
                  </span>
                )}

                {pooled > 0 && !closed && (
                  <span className="mt-1 rounded-full bg-signal px-2 py-0.5 text-[0.58rem] font-extrabold uppercase tracking-[0.1em] text-signal-foreground shadow">
                    Co-funded pool
                  </span>
                )}
                {!closed && r.bounty >= HIGH_BOUNTY && (
                  <span className="mt-1">
                    <ExpiryCountdown minutesLeft={r.expiresInMin} highlight />
                  </span>
                )}
                {!closed && r.status === "open" && (
                  <span className="mt-1">
                    <UrgencyBadge minutesLeft={r.expiresInMin} bounty={pool} compact />
                  </span>
                )}
                <span
                  className={cn("size-1.5 rotate-45 -translate-y-[3px]")}
                  style={{
                    backgroundColor: gatheringMode
                      ? "var(--gathering-high)"
                      : trafficMode
                      ? r.minutesAgo <= 15 ? "var(--traffic-heavy)" : "var(--traffic-slow)"
                      : crisisMode
                      ? "var(--crisis)"
                      : closed
                      ? "var(--border)"
                      : tier === "gold"
                        ? "var(--pin-gold)"
                        : tier === "medium"
                          ? "var(--pin-medium)"
                          : "var(--pin-standard)",
                  }}
                />
                <span
                  role="button"
                  aria-label="Share this bounty"
                  onClick={(e) => {
                    e.stopPropagation();
                    void shareBounty(r);
                  }}
                  className="mt-1 flex size-6 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground shadow-lg"
                >
                  <Share2 className="size-3" />
                </span>
              </span>
            </button>
          );
        })}

      <div className={`absolute right-4 z-40 flex flex-col items-end gap-2 ${controlsTopClass}`}>
        <div className="grid grid-rows-2 overflow-hidden rounded-xl border border-home-line bg-home-glass-strong shadow-xl backdrop-blur-2xl">
          {[
            { label: "+", fn: () => zoomBy(1) },
            { label: "−", fn: () => zoomBy(-1) },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.fn}
              aria-label={b.label === "+" ? "Zoom in" : "Zoom out"}
              className="flex size-10 items-center justify-center border-b border-home-line text-base font-semibold leading-none text-foreground transition-colors last:border-b-0 hover:bg-home-accent/12 hover:text-home-accent"
            >
              {b.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={locateMe}
          aria-label="Recenter to my location"
          title={geoMessage ?? "Recenter to my location"}
          className="flex size-10 items-center justify-center rounded-xl border border-home-line bg-home-glass-strong text-foreground shadow-xl backdrop-blur-2xl transition-colors hover:border-home-accent/50 hover:bg-home-accent/12 hover:text-home-accent"
        >
          <LocateFixed className={geoState === "pending" ? "size-4 animate-pulse" : "size-4"} />
        </button>
        {(geoState === "unavailable" || geoState === "denied") && (
          <p className="w-28 rounded-xl border border-home-line bg-home-glass-strong px-2 py-1 text-[10px] font-medium leading-tight text-foreground/65 backdrop-blur-2xl">
            {geoState === "denied" ? "Allow location in device settings" : "Location unavailable, tap to retry"}
          </p>
        )}
      </div>
    </div>
  );
}
