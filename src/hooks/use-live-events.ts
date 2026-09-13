import { useEffect, useState } from "react";
import { fetchLiveEvents, type LiveEvent } from "@/lib/ticketmaster.functions";
import type { DiscoveryArea } from "@/hooks/use-discovery-area";

type Options = {
  radiusMiles?: number;
  weekendOnly?: boolean;
  size?: number;
  keyword?: string;
};

/** Ticketed events happening around the area the person is browsing. */
export function useLiveEvents(area: DiscoveryArea, options: Options = {}) {
  const { radiusMiles = 50, weekendOnly = true, size = 20, keyword } = options;
  const [events, setEvents] = useState<LiveEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void fetchLiveEvents({
      data: {
        latitude: area.latitude,
        longitude: area.longitude,
        radiusMiles,
        weekendOnly,
        size,
        ...(keyword ? { keyword } : {}),
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
  }, [area.latitude, area.longitude, radiusMiles, weekendOnly, size, keyword]);

  return { events, loading };
}
