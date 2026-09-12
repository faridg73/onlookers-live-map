import { useCallback, useEffect, useState } from "react";

/** A place someone wants to be told about when new bounties appear nearby. */
export type RadarSpot = {
  slug: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
};

const KEY = "onlooker.radar-spots";
const EVENT = "onlooker:radar-change";

function read(): RadarSpot[] {
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as RadarSpot[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function write(spots: RadarSpot[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(spots));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Bounty Radar: the spots and neighbourhoods a person follows. Kept on the
 * device so it works before sign-in, and shared across screens live.
 */
export function useRadar() {
  const [spots, setSpots] = useState<RadarSpot[]>([]);

  useEffect(() => {
    const sync = () => setSpots(read());
    sync();
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const isWatched = useCallback(
    (slug: string) => spots.some((s) => s.slug === slug),
    [spots],
  );

  const toggle = useCallback((spot: RadarSpot) => {
    const current = read();
    const next = current.some((s) => s.slug === spot.slug)
      ? current.filter((s) => s.slug !== spot.slug)
      : [...current, spot];
    write(next);
    return next.some((s) => s.slug === spot.slug);
  }, []);

  const remove = useCallback((slug: string) => {
    write(read().filter((s) => s.slug !== slug));
  }, []);

  return { spots, isWatched, toggle, remove };
}
