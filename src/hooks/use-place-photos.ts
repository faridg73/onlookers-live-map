import { useEffect, useState } from "react";
import { fetchPlacePhotoUrls, type DiscoveredPlace } from "@/lib/places.functions";

const cache = new Map<string, string>();

/**
 * Thumbnail URLs for a list of live places, resolved in one batched call and
 * cached for the session so scrolling the trending feed stays cheap.
 */
export function usePlacePhotos(places: DiscoveredPlace[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const names = places
    .map((place) => place.photoName)
    .filter((name): name is string => Boolean(name));
  const key = names.join("|");

  useEffect(() => {
    if (names.length === 0) return;

    const known: Record<string, string> = {};
    const missing: string[] = [];
    for (const name of names) {
      const cached = cache.get(name);
      if (cached) known[name] = cached;
      else missing.push(name);
    }
    if (Object.keys(known).length > 0) setUrls((prev) => ({ ...prev, ...known }));
    if (missing.length === 0) return;

    let cancelled = false;
    void fetchPlacePhotoUrls({ data: { photoNames: missing.slice(0, 16), maxWidthPx: 480 } })
      .then((result) => {
        for (const [name, url] of Object.entries(result)) cache.set(name, url);
        if (!cancelled) setUrls((prev) => ({ ...prev, ...result }));
      })
      .catch((error) => console.error("[discovery] place photos failed", error));

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (place: DiscoveredPlace) => (place.photoName ? urls[place.photoName] ?? null : null);
}
