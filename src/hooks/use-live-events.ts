import { useEffect, useState } from "react";
import { fetchTrendingEvents, type LiveEvent } from "@/lib/events.functions";
import type { DiscoveryArea } from "@/hooks/use-discovery-area";

type Options = {
  radiusMiles?: number;
  weekendOnly?: boolean;
  size?: number;
  /** "major" = arena scale, "local" = neighbourhood pop-ups, "all" = both. */
  scope?: "all" | "major" | "local";
};

/** Live events happening around the area the person is browsing. */
export function useLiveEvents(area: DiscoveryArea, options: Options = {}) {
  const { radiusMiles = 50, weekendOnly = true, size = 20, scope = "all" } = options;
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchTrendingEvents({
      data: {
        latitude: area.latitude,
        longitude: area.longitude,
        radiusMiles,
        weekendOnly,
        size,
        scope,
      },
    })
      .then((result) => {
        if (!cancelled) setEvents(result);
      })
      .catch(() => {
        if (!cancelled) setEvents([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [area.latitude, area.longitude, radiusMiles, weekendOnly, size, scope]);

  return { events, loading };
}
