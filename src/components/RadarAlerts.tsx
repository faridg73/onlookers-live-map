import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { distanceMiles, requestMapPosition } from "@/lib/onlooker";
import { useOnlooker } from "@/lib/onlooker-store";
import { useRadar } from "@/hooks/use-radar";

const SEEN_KEY = "onlooker.radar-seen";
const RADIUS_MILES = 5;

/**
 * Watches the live board and pops an alert whenever a new bounty appears close
 * to one of the spots the person follows on their Bounty Radar.
 */
export function RadarAlerts() {
  const { requests } = useOnlooker();
  const { spots } = useRadar();
  const seen = useRef<Set<string> | null>(null);

  useEffect(() => {
    if (spots.length === 0) return;
    if (!seen.current) {
      try {
        seen.current = new Set<string>(
          JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]") as string[],
        );
      } catch {
        seen.current = new Set<string>();
      }
    }
    const known = seen.current;
    let changed = false;

    for (const request of requests) {
      if (request.status !== "open" || known.has(request.id)) continue;
      const position = requestMapPosition(request);
      const near = spots.find(
        (spot) =>
          distanceMiles(position, { lat: spot.latitude, lng: spot.longitude }) <= RADIUS_MILES,
      );
      known.add(request.id);
      changed = true;
      if (near) {
        toast.success(`New bounty near ${near.name}`, {
          description: `${request.title} · $${request.bounty}`,
        });
      }
    }

    if (changed) {
      try {
        localStorage.setItem(SEEN_KEY, JSON.stringify([...known].slice(-300)));
      } catch {
        /* storage unavailable */
      }
    }
  }, [requests, spots]);

  return null;
}
