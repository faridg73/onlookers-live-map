/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from "react";
import { Coins, LocateFixed, Share2 } from "lucide-react";
import { shareBounty } from "@/lib/bounty-share";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ExpiryCountdown, HIGH_BOUNTY } from "@/components/ExpiryCountdown";
import { bountyTier, categoryGlyph, TIER_LABELS } from "@/lib/bounty-tiers";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { fetchNearbyPlaces, type NearbyPlace } from "@/lib/places.functions";
import { useBoosts } from "@/lib/boosts-store";
import { fetchHunterStats, tierForLevel } from "@/lib/gamification";
import { GeolocationFailure, requestCurrentPosition } from "@/lib/geolocation";
import { REGIONAL_CENTER, requestMapPosition, type LiveRequest, type MapPosition } from "@/lib/onlooker";
import { isClosed } from "@/lib/onlooker-store";
import { cn } from "@/lib/utils";

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

type Pixel = { left: number; top: number };

/** Real Google street map with bounty pins drawn on top. */
export function MapCanvas({
  requests,
  selectedId,
  onSelect,
  onUserPositionChange,
}: {
  requests: LiveRequest[];
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUserPositionChange?: (position: MapPosition | null) => void;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const overlay = useRef<google.maps.OverlayView | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tick, setTick] = useState(0);
  const [userPos, setUserPos] = useState<google.maps.LatLngLiteral | null>(null);
  const [geoState, setGeoState] = useState<"pending" | "located" | "denied" | "unavailable">("pending");
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const { boostOf } = useBoosts();
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const lastPlaceKey = useRef<string>("");
  const [me, setMe] = useState<{ hunterLevel: number; isIncognito: boolean } | null>(null);

  // Own status tier colours the marker; incognito hides the precise dot.
  useEffect(() => {
    void fetchHunterStats().then((stats) =>
      setMe(stats ? { hunterLevel: stats.hunterLevel, isIncognito: stats.isIncognito } : null),
    );
  }, []);

  // Boot the map once.
  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        map.current = new maps.Map(holder.current, {
          center: REGIONAL_CENTER,
          zoom: 13,
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          // Keep Google's own place, business and transit labels visible so the
          // map reads like a real street map as people zoom in and out.
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "on" }] },
            { featureType: "poi.business", elementType: "labels", stylers: [{ visibility: "on" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "on" }] },
          ],
        });
        const ov = new maps.OverlayView();
        ov.onAdd = () => {};
        ov.onRemove = () => {};
        ov.draw = () => setTick((t) => t + 1);
        ov.setMap(map.current);
        overlay.current = ov;
        map.current.addListener("bounds_changed", () => setTick((t) => t + 1));
        map.current.addListener("click", () => onSelect(null));
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
  }, []);

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

  // Business names for whatever is on screen, refreshed after panning stops.
  useEffect(() => {
    if (!ready) return;
    const timer = window.setTimeout(() => {
      const m = map.current;
      const center = m?.getCenter();
      const zoom = m?.getZoom();
      const bounds = m?.getBounds();
      if (!center || typeof zoom !== "number" || !bounds) return;
      if (zoom < 15) {
        setPlaces([]);
        lastPlaceKey.current = "";
        return;
      }
      const lat = center.lat();
      const lng = center.lng();
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const spanMeters = Math.max(
        200,
        Math.min(3000, ((ne.lat() - sw.lat()) * 111_000) / 2),
      );
      const key = `${lat.toFixed(3)}:${lng.toFixed(3)}:${Math.round(spanMeters / 100)}`;
      if (key === lastPlaceKey.current) return;
      lastPlaceKey.current = key;
      void fetchNearbyPlaces({ data: { latitude: lat, longitude: lng, radiusMeters: spanMeters } })
        .then(setPlaces)
        .catch((error) => console.error("[Onlooker map] nearby places failed", error));
    }, 700);
    return () => window.clearTimeout(timer);
  }, [ready, tick]);

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
    if (typeof z === "number") map.current?.setZoom(clamp(z + delta, 3, 20));
  };

  // `tick` re-runs pixel math whenever the map moves.
  void tick;
  const userPixel = ready && userPos ? toPixel(userPos) : null;

  return (
    <div className="absolute inset-0 overflow-hidden bg-map">
      <div ref={holder} className="absolute inset-0" style={{ touchAction: "none" }} />

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
              <span
                className="size-3.5 rounded-full border-2 border-surface shadow-lg"
                style={{ backgroundColor: tierForLevel(me?.hunterLevel ?? 1).dot }}
              />
            </span>
          )}
        </div>
      )}

      {/* nearby business names */}
      {ready &&
        places.map((place) => {
          const pixel = toPixel({ lat: place.latitude, lng: place.longitude });
          if (!pixel) return null;
          return (
            <span
              key={place.id}
              className="pointer-events-none absolute flex max-w-[8.5rem] -translate-x-1/2 -translate-y-1/2 items-center gap-1 rounded-full bg-surface/85 px-2 py-0.5 text-[0.6rem] font-bold leading-tight text-foreground shadow-sm backdrop-blur"
              style={{ left: pixel.left, top: pixel.top }}
              title={place.primaryType ? `${place.name} · ${place.primaryType}` : place.name}
            >
              <span className="size-1.5 shrink-0 rounded-full bg-signal" />
              <span className="truncate">{place.name}</span>
            </span>
          );
        })}

      {/* pins — theme changes with the total coin bounty */}
      {ready &&
        requests.map((r) => {
          const pixel = toPixel(requestMapPosition(r));
          if (!pixel) return null;
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
              aria-label={`${TIER_LABELS[tier]}: ${pool} coins at ${r.place}`}
            >
              <span className="relative flex flex-col items-center">
                {/* gold pins keep a soft pulsing halo ring */}
                {tier === "gold" && !closed && (
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
                {tier === "medium" && r.status === "open" && (
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

                {tier === "standard" ? (
                  /* subtle blue pin with a plain category glyph */
                  <span
                    className={cn(
                      "relative flex items-center gap-1 rounded-full border px-2 py-0.5 text-[0.62rem] font-bold shadow",
                      closed ? "border-border bg-surface text-muted-foreground" : "text-white",
                    )}
                    style={
                      closed
                        ? undefined
                        : {
                            borderColor: "color-mix(in oklch, var(--pin-standard) 70%, black)",
                            backgroundColor: "color-mix(in oklch, var(--pin-standard) 82%, black)",
                          }
                    }
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
                    {/* silver coin for medium bounties, gold coin badge for gold */}
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
                      <Coins className={tier === "gold" ? "size-4" : "size-2.5"} />
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
                <span
                  className={cn("size-1.5 rotate-45 -translate-y-[3px]")}
                  style={{
                    backgroundColor: closed
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

      <div className="absolute right-4 z-40 flex flex-col gap-2 top-[calc(env(safe-area-inset-top,0px)+7.5rem)]">
        <div className="grid grid-rows-2 overflow-hidden rounded-lg border border-border bg-surface/90 shadow-lg backdrop-blur">
          {[
            { label: "+", fn: () => zoomBy(1) },
            { label: "−", fn: () => zoomBy(-1) },
          ].map((b) => (
            <button
              key={b.label}
              type="button"
              onClick={b.fn}
              aria-label={b.label === "+" ? "Zoom in" : "Zoom out"}
              className="flex size-11 items-center justify-center border-b border-border text-xl font-bold leading-none text-foreground transition-colors last:border-b-0 hover:bg-surface-raised"
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
          className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface/90 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-surface-raised"
        >
          <LocateFixed className={geoState === "pending" ? "size-4 animate-pulse" : "size-4"} />
        </button>
        {(geoState === "unavailable" || geoState === "denied") && (
          <p className="w-28 rounded-lg border border-border bg-surface/90 px-2 py-1 text-[10px] font-medium leading-tight text-muted-foreground backdrop-blur">
            {geoState === "denied" ? "Allow location in device settings" : "Location unavailable — tap to retry"}
          </p>
        )}
      </div>
    </div>
  );
}
