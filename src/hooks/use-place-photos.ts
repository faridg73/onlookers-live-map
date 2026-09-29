// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { fetchPlacePhotoUrls, type DiscoveredPlace } from "@/lib/places.functions";

const cache = new Map<string, string>();
/** Photos Google answered for but had nothing to give — no point re-asking this session. */
const emptyCache = new Set<string>();

/**
 * Thumbnail URLs for a list of live places, resolved in one batched call and
 * cached for the session so scrolling the trending feed stays cheap.
 *
 * Returns `undefined` while a place's photo is still being resolved and `null`
 * only once we know it has none, so cards can wait instead of flashing an
 * initials tile on first visit.
 */
export function usePlacePhotos(places: DiscoveredPlace[]) {
  const [urls, setUrls] = useState<Record<string, string>>({});
  const [settled, setSettled] = useState<Record<string, true>>({});
  const names = places
    .map((place) => place.photoName)
    .filter((name): name is string => Boolean(name));
  const key = names.join("|");

  useEffect(() => {
    if (names.length === 0) return;

    const known: Record<string, string> = {};
    const done: Record<string, true> = {};
    const missing: string[] = [];
    for (const name of names) {
      const cached = cache.get(name);
      if (cached) {
        known[name] = cached;
        done[name] = true;
      } else if (emptyCache.has(name)) {
        done[name] = true;
      } else missing.push(name);
    }
    if (Object.keys(known).length > 0) setUrls((prev) => ({ ...prev, ...known }));
    if (Object.keys(done).length > 0) setSettled((prev) => ({ ...prev, ...done }));
    if (missing.length === 0) return;

    let cancelled = false;
    // Google's media endpoint is batched 16 at a time, so walk every chunk instead of
    // dropping the tail: each card must resolve its own verified photo.
    const chunks: string[][] = [];
    for (let i = 0; i < missing.length; i += 16) chunks.push(missing.slice(i, i + 16));
    for (const chunk of chunks) {
      void fetchPlacePhotoUrls({ data: { photoNames: chunk, maxWidthPx: 480 } })
        .then((result) => {
          for (const [name, url] of Object.entries(result)) cache.set(name, url);
          for (const name of chunk) if (!result[name]) emptyCache.add(name);
          if (cancelled) return;
          setUrls((prev) => ({ ...prev, ...result }));
          setSettled((prev) => {
            const next = { ...prev };
            for (const name of chunk) next[name] = true;
            return next;
          });
        })
        .catch((error) => {
          console.error("[discovery] place photos failed", error);
          if (cancelled) return;
          setSettled((prev) => {
            const next = { ...prev };
            for (const name of chunk) next[name] = true;
            return next;
          });
        });
    }

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return (place: DiscoveredPlace): string | null | undefined => {
    const name = place.photoName;
    if (!name) return null;
    const url = urls[name];
    if (url) return url;
    return settled[name] ? null : undefined;
  };
}
