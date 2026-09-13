import { useEffect, useState } from "react";
import { searchPlacesByCategory, type DiscoveredPlace } from "@/lib/places.functions";
import type { DiscoveryArea } from "@/hooks/use-discovery-area";
import type { DiscoveryGroup } from "@/lib/discovery";

const cache = new Map<string, DiscoveredPlace[]>();

/**
 * Live places of one category around the browsing area. Cached per area and
 * refinement so switching chips feels instant and keeps Places usage bounded.
 */
export function usePlaceList(
  group: DiscoveryGroup | undefined,
  subId: string | null,
  area: DiscoveryArea,
  options?: { maxResults?: number; enabled?: boolean },
) {
  const [places, setPlaces] = useState<DiscoveredPlace[]>([]);
  const [loading, setLoading] = useState(false);

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
        if (!cancelled) setPlaces(result);
      })
      .catch((error) => {
        console.error("[discovery] place list failed", error);
        if (!cancelled) setPlaces([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, enabled]);

  return { places, loading };
}
