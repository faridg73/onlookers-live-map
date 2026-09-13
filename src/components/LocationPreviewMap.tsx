/// <reference types="google.maps" />
import { useCallback, useEffect, useRef, useState } from "react";
import { Building2, LocateFixed, MapPin, Minus, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode.functions";
import { GeolocationFailure, requestCurrentPosition } from "@/lib/geolocation";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { fetchNearbyPlaces, type NearbyPlace } from "@/lib/places.functions";

export type PickedLocation = { latitude: number; longitude: number; formatted: string };

type Props = {
  address: string;
  onPick?: (location: PickedLocation) => void;
};

const FALLBACK = { lat: 34.0522, lng: -118.2437 };
const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

/** Full location picker using the same Google street map behavior as discovery. */
export function LocationPreviewMap({ address, onPick }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const pick = useRef(onPick);
  const lastPlaceKey = useRef("");
  pick.current = onPick;

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pinned, setPinned] = useState<PickedLocation | null>(null);
  const [places, setPlaces] = useState<NearbyPlace[]>([]);
  const [locating, setLocating] = useState(false);

  const applyReverse = useCallback(async (lat: number, lng: number) => {
    setStatus("Finding this address…");
    const found = await reverseGeocode({ data: { latitude: lat, longitude: lng } }).catch(() => null);
    const next = { latitude: lat, longitude: lng, formatted: found?.formatted ?? "Dropped pin" };
    setPinned(next);
    setStatus(null);
    pick.current?.(next);
  }, []);

  const refreshPlaces = useCallback(() => {
    const current = map.current;
    const center = current?.getCenter();
    const zoom = current?.getZoom();
    const bounds = current?.getBounds();
    if (!center || !bounds || typeof zoom !== "number" || zoom < 15) {
      setPlaces([]);
      return;
    }
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    const radiusMeters = Math.max(200, Math.min(2000, ((ne.lat() - sw.lat()) * 111_000) / 2));
    const key = `${center.lat().toFixed(3)}:${center.lng().toFixed(3)}:${Math.round(radiusMeters / 100)}`;
    if (key === lastPlaceKey.current) return;
    lastPlaceKey.current = key;
    void fetchNearbyPlaces({
      data: { latitude: center.lat(), longitude: center.lng(), radiusMeters },
    })
      .then((rows) => setPlaces(rows.slice(0, 6)))
      .catch((error) => console.error("[Request map] nearby places failed", error));
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        const nextMap = new maps.Map(holder.current, {
          center: FALLBACK,
          zoom: 15,
          clickableIcons: false,
          disableDefaultUI: true,
          gestureHandling: "greedy",
          styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "on" }] },
            { featureType: "poi.business", elementType: "labels", stylers: [{ visibility: "on" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "on" }] },
          ],
        });
        const nextMarker = new maps.Marker({ map: nextMap, position: FALLBACK, draggable: true });
        map.current = nextMap;
        marker.current = nextMarker;
        nextMarker.addListener("dragend", () => {
          const position = nextMarker.getPosition();
          if (position) void applyReverse(position.lat(), position.lng());
        });
        nextMap.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          nextMarker.setPosition(event.latLng);
          void applyReverse(event.latLng.lat(), event.latLng.lng());
        });
        nextMap.addListener("idle", refreshPlaces);
        setReady(true);
      })
      .catch((error) => {
        console.error("[Request map] Google Maps failed to load", error);
        setStatus("The map is unavailable right now. You can still enter the address above.");
      });
    return () => {
      cancelled = true;
    };
  }, [applyReverse, refreshPlaces]);

  useEffect(() => {
    if (!ready) return;
    const query = address.trim();
    if (query.length < 4) return;
    const timer = window.setTimeout(async () => {
      const found = await geocodeAddress({ data: { address: query } }).catch(() => null);
      if (!found) {
        setStatus("No match yet — keep typing or place the pin yourself.");
        return;
      }
      const position = { lat: found.latitude, lng: found.longitude };
      map.current?.panTo(position);
      map.current?.setZoom(17);
      marker.current?.setPosition(position);
      setPinned(found);
      setStatus(null);
      pick.current?.(found);
    }, 600);
    return () => window.clearTimeout(timer);
  }, [address, ready]);

  const zoomBy = (delta: number) => {
    const current = map.current?.getZoom();
    if (typeof current === "number") map.current?.setZoom(clamp(current + delta, 3, 20));
  };

  const locateMe = async () => {
    setLocating(true);
    setStatus("Finding your precise location…");
    try {
      const position = await requestCurrentPosition();
      const next = { lat: position.coords.latitude, lng: position.coords.longitude };
      map.current?.panTo(next);
      map.current?.setZoom(17);
      marker.current?.setPosition(next);
      await applyReverse(next.lat, next.lng);
    } catch (error) {
      console.error("[Request map] location request failed", error);
      setStatus(
        error instanceof GeolocationFailure && error.code === "denied"
          ? "Allow location access in your device settings, then try again."
          : "Your location could not be found. Try again or place the pin yourself.",
      );
    } finally {
      setLocating(false);
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="relative h-[18rem] w-full sm:h-[22rem]" onTouchStart={(event) => event.stopPropagation()}>
        <div ref={holder} className="absolute inset-0" style={{ touchAction: "none" }} />
        <div className="absolute right-3 top-3 z-10 flex flex-col gap-2">
          <div className="overflow-hidden rounded-md border border-border bg-surface/90 shadow-lg backdrop-blur">
            <Button type="button" variant="ghost" size="icon" onClick={() => zoomBy(1)} aria-label="Zoom in" className="rounded-none border-b border-border">
              <Plus />
            </Button>
            <Button type="button" variant="ghost" size="icon" onClick={() => zoomBy(-1)} aria-label="Zoom out" className="rounded-none">
              <Minus />
            </Button>
          </div>
          <Button type="button" variant="secondary" size="icon" onClick={() => void locateMe()} aria-label="Use my current location" title="Use my current location">
            <LocateFixed className={locating ? "animate-pulse text-signal" : "text-signal"} />
          </Button>
        </div>
      </div>
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-start gap-2">
          <MapPin className="mt-0.5 size-4 shrink-0 text-signal" />
          <p className="text-xs font-semibold text-foreground/80">
            {status ?? pinned?.formatted ?? "Search above, tap the map, or drag the pin to the exact spot."}
          </p>
        </div>
        {places.length > 0 && (
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1" aria-label="Nearby places">
            {places.map((place) => (
              <button
                key={place.id}
                type="button"
                onClick={() => {
                  const next = { lat: place.latitude, lng: place.longitude };
                  map.current?.panTo(next);
                  marker.current?.setPosition(next);
                  void applyReverse(next.lat, next.lng);
                }}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-border bg-surface-raised px-3 py-1.5 text-xs font-bold text-foreground hover:border-signal"
              >
                <Building2 className="size-3.5 text-signal" />
                {place.name}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}