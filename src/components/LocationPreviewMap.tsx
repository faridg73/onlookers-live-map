import { useEffect, useRef, useState } from "react";
import { MapPin } from "lucide-react";

import { loadGoogleMaps } from "@/lib/google-maps-loader";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode.functions";

export type PickedLocation = { latitude: number; longitude: number; formatted: string };

type Props = {
  /** Address text typed into the "Where" field. */
  address: string;
  /** Fires whenever the pin lands on a new spot. */
  onPick?: (location: PickedLocation) => void;
};

const FALLBACK = { lat: 34.0522, lng: -118.2437 };

/**
 * Mini street-level map under the "Where" field. Follows what the poster types
 * and lets them drag the pin to the exact spot.
 */
export function LocationPreviewMap({ address, onPick }: Props) {
  const holder = useRef<HTMLDivElement | null>(null);
  const map = useRef<google.maps.Map | null>(null);
  const marker = useRef<google.maps.Marker | null>(null);
  const pick = useRef(onPick);
  pick.current = onPick;

  const [ready, setReady] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  const [pinned, setPinned] = useState<PickedLocation | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadGoogleMaps()
      .then((maps) => {
        if (cancelled || !holder.current) return;
        map.current = new maps.Map(holder.current, {
          center: FALLBACK,
          zoom: 15,
          clickableIcons: false,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [{ featureType: "poi", stylers: [{ visibility: "off" }] }],
        });
        marker.current = new maps.Marker({
          map: map.current,
          position: FALLBACK,
          draggable: true,
        });
        marker.current.addListener("dragend", () => {
          const pos = marker.current?.getPosition();
          if (!pos) return;
          void applyReverse(pos.lat(), pos.lng());
        });
        map.current.addListener("click", (event: google.maps.MapMouseEvent) => {
          if (!event.latLng) return;
          marker.current?.setPosition(event.latLng);
          void applyReverse(event.latLng.lat(), event.latLng.lng());
        });
        setReady(true);
      })
      .catch(() => setStatus("Map preview is unavailable right now."));
    return () => {
      cancelled = true;
    };
  }, []);

  async function applyReverse(lat: number, lng: number) {
    const found = await reverseGeocode({ data: { latitude: lat, longitude: lng } }).catch(() => null);
    const next = { latitude: lat, longitude: lng, formatted: found?.formatted ?? "Dropped pin" };
    setPinned(next);
    setStatus(null);
    pick.current?.(next);
  }

  // Follow the typed address, debounced so we don't look up every keystroke.
  useEffect(() => {
    if (!ready) return;
    const query = address.trim();
    if (query.length < 4) return;
    const timer = window.setTimeout(async () => {
      const found = await geocodeAddress({ data: { address: query } }).catch(() => null);
      if (!found) {
        setStatus("No match yet — keep typing or drag the pin.");
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

  return (
    <div
      className="overflow-hidden rounded-xl border border-border bg-surface"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div ref={holder} className="h-44 w-full" style={{ touchAction: "none" }} />
      <div className="flex items-start gap-2 border-t border-border px-3 py-2">
        <MapPin className="mt-0.5 size-4 shrink-0 text-signal" />
        <p className="text-xs font-semibold text-foreground/80">
          {status ?? pinned?.formatted ?? "Type an address or tap the map to drop the pin."}
        </p>
      </div>
    </div>
  );
}
