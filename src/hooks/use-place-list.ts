// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { searchPlacesByCategory, type DiscoveredPlace } from "@/lib/places.functions";
import type { DiscoveryArea } from "@/hooks/use-discovery-area";
import type { DiscoveryGroup } from "@/lib/discovery";

const cache = new Map<string, DiscoveredPlace[]>();
const STORE_KEY = "onlooker:last-places:v1";
/** After a quota/outage failure, pause further lookups for this long. */
const PAUSE_MS = 15 * 60 * 1000;
let pausedUntil = 0;

function readStore(): Record<string, DiscoveredPlace[]> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(window.localStorage.getItem(STORE_KEY) ?? "{}");
  } catch {
    return {};
  }
}

function writeStore(key: string, places: DiscoveredPlace[]) {
  if (typeof window === "undefined" || places.length === 0) return;
  try {
    const store = readStore();
    store[key] = places;
    const keys = Object.keys(store);
    // Keep the saved copy small.
    for (const old of keys.slice(0, Math.max(0, keys.length - 40))) delete store[old];
    window.localStorage.setItem(STORE_KEY, JSON.stringify(store));
  } catch {
    /* storage full or blocked — fine */
  }
}

/**
 * Live places of one category around the browsing area. Cached per area and
 * refinement so switching chips feels instant and keeps Places usage bounded.
 * When a lookup fails, the last good results stay on screen and `unavailable`
 * is set so the page can explain the outage rather than show "nothing here".
 */
export function usePlaceList(
  group: DiscoveryGroup | undefined,
  subId: string | null,
  area: DiscoveryArea,
  options?: { maxResults?: number; enabled?: boolean },
) {
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);

  const enabled = options?.enabled ?? true;
  const maxResults = options?.maxResults ?? 12;
  const sub = group?.subs.find((s) => s.id === subId);
  const types = (sub?.includedTypes ?? group?.includedTypes ?? []).slice(0, 6);
  const key = group
    ? `${group.slug}:${subId ?? "all"}:${area.latitude.toFixed(2)}:${area.longitude.toFixed(2)}:${maxResults}`
    : "";

  useEffect(() => {
    if (!group || !enabled || types.length === 0) return;

    const cached = cache.get(key);
    if (cached) {
      setPlaces(cached);
      setUnavailable(false);
      return;
    }

    const fallback = () => {
      const saved = readStore()[key];
      setUnavailable(true);
      // Keep whatever is already showing; otherwise use the saved copy.
      setPlaces((current) => (current.length > 0 ? current : (saved ?? [])));
    };

    if (Date.now() < pausedUntil) {
      fallback();
      return;
    }

    let cancelled = false;
    setLoading(true);
    void searchPlacesByCategory({
      data: {
        latitude: area.latitude,
        longitude: area.longitude,
        radiusMeters: 20000,
        includedTypes: types,
        maxResults,
      },
    })
      .then((result) => {
        cache.set(key, result);
        writeStore(key, result);
        if (!cancelled) {
          setPlaces(result);
          setUnavailable(false);
        }
      })
      .catch((error) => {
        console.error("[discovery] place list failed", error);
        pausedUntil = Date.now() + PAUSE_MS;
        if (!cancelled) fallback();
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { places, loading, unavailable };
}
