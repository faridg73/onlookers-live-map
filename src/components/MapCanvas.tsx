/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from "react";
import { LocateFixed, Share2 } from "lucide-react";
import { shareBounty } from "@/lib/bounty-share";
import { CategoryBadge } from "@/components/CategoryBadge";
import { ExpiryCountdown, HIGH_BOUNTY } from "@/components/ExpiryCountdown";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
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
  const [geoState, setGeoState] = useState<"pending" | "located" | "unavailable">("pending");

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
      .catch(() => setFailed(true));
    return () => {
      cancelled = true;
      overlay.current?.setMap(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Ask the device for its position and center the map on it. */
  const locateMe = useCallback(() => {
    if (!("geolocation" in navigator)) {
      setGeoState("unavailable");
      return;
    }
    setGeoState("pending");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const at = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserPos(at);
        onUserPositionChange?.(at);
        setGeoState("located");
        map.current?.panTo(at);
      },
      () => {
        setGeoState("unavailable");
        onUserPositionChange?.(null);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 },
    );
  }, [onUserPositionChange]);

  useEffect(() => {
    locateMe();
  }, [locateMe]);

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
          <span className="relative flex size-5 items-center justify-center">
            <span className="absolute inset-0 animate-ping-slow rounded-full bg-live/40" />
            <span className="size-3.5 rounded-full border-2 border-surface bg-live shadow-lg" />
          </span>
        </div>
      )}

      {/* pins */}
      {ready &&
        requests.map((r) => {
          const pixel = toPixel(requestMapPosition(r));
          if (!pixel) return null;
          const isSel = r.id === selectedId;
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
            >
              <span className="relative flex flex-col items-center">
                {r.status === "open" && (
                  <span
                    className="absolute bottom-0 size-8 animate-ping-slow rounded-full"
                    style={{
                      backgroundColor:
                        r.bounty >= HIGH_BOUNTY && r.expiresInMin <= 15
                          ? "color-mix(in oklch, var(--urgent) 30%, transparent)"
                          : "color-mix(in oklch, var(--live) 25%, transparent)",
                    }}
                  />
                )}
                {!isClosed(r) && (
                  <span className="mb-1">
                    <CategoryBadge category={r.category} compact />
                  </span>
                )}
                <span
                  className={cn(
                    "relative rounded-full border-2 px-3 py-1.5 font-display text-base font-extrabold tracking-tight tabular-nums shadow-lg",
                    isClosed(r)
                      ? "border-border bg-surface text-muted-foreground"
                      : isSel
                        ? "border-signal bg-signal text-signal-foreground"
                        : "border-signal bg-surface text-signal",
                  )}
                >
                  ${r.bounty}
                </span>
                {!isClosed(r) && r.bounty >= HIGH_BOUNTY && (
                  <span className="mt-1">
                    <ExpiryCountdown minutesLeft={r.expiresInMin} highlight />
                  </span>
                )}
                <span
                  className={cn(
                    "size-1.5 rotate-45 -translate-y-[3px]",
                    isClosed(r) ? "bg-border" : "bg-signal",
                  )}
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

      <div className="absolute right-4 flex flex-col gap-2 top-[calc(env(safe-area-inset-top)+5.75rem)]">
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
          title={
            geoState === "unavailable"
              ? "Location unavailable — showing the regional center"
              : "Recenter to my location"
          }
          className="flex size-11 items-center justify-center rounded-lg border border-border bg-surface/90 text-foreground shadow-lg backdrop-blur transition-colors hover:bg-surface-raised"
        >
          <LocateFixed className={geoState === "pending" ? "size-4 animate-pulse" : "size-4"} />
        </button>
        {geoState === "unavailable" && (
          <p className="w-28 rounded-lg border border-border bg-surface/90 px-2 py-1 text-[10px] font-medium leading-tight text-muted-foreground backdrop-blur">
            Location off — showing regional view
          </p>
        )}
      </div>
    </div>
  );
}
