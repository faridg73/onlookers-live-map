// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { fetchTrendingEvents, type LiveEvent } from "@/lib/events.functions";
import { fetchLocalUserEvents } from "@/lib/local-events";
import { distanceMiles } from "@/lib/onlooker";
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
    const center = { lat: area.latitude, lng: area.longitude };
    void Promise.all([
      fetchTrendingEvents({
        data: {
          latitude: area.latitude,
          longitude: area.longitude,
          radiusMiles,
          weekendOnly,
          size,
          scope,
        },
      }).catch(() => [] as LiveEvent[]),
      // Real listings posted by members sit alongside the ticketed events.
      scope === "major"
        ? Promise.resolve([] as LiveEvent[])
        : fetchLocalUserEvents().catch(() => [] as LiveEvent[]),
    ])
      .then(([provider, local]) => {
        if (cancelled) return;
        const nearby = local.filter((event) => {
          if (event.latitude === null || event.longitude === null) return true;
          return (
            distanceMiles(center, { lat: event.latitude, lng: event.longitude }) <= radiusMiles
          );
        });
        setEvents([...nearby, ...provider]);
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
