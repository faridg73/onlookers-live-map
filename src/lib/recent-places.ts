export type RecentPlace = {
  label: string;
  formatted: string;
  latitude: number;
  longitude: number;
  at: number;
};

const KEY = "onlooker.recent-places";
const LIMIT = 6;

function shortLabel(formatted: string) {
  const first = formatted.split(",")[0]?.trim() ?? formatted.trim();
  return first.length > 28 ? `${first.slice(0, 27)}…` : first || "Saved spot";
}

/** Past venue and GPS selections, newest first. */
export function readRecentPlaces(): RecentPlace[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const rows = raw ? (JSON.parse(raw) as RecentPlace[]) : [];
    return Array.isArray(rows)
      ? rows
          .filter(
            (row) =>
              typeof row?.formatted === "string" &&
              Number.isFinite(row?.latitude) &&
              Number.isFinite(row?.longitude),
          )
          .sort((a, b) => (b.at ?? 0) - (a.at ?? 0))
          .slice(0, LIMIT)
      : [];
  } catch {
    return [];
  }
}

/** Remember a chosen location so it can be re-picked with one tap. */
export function rememberRecentPlace(place: {
  formatted: string;
  latitude: number;
  longitude: number;
  label?: string;
}): RecentPlace[] {
  if (typeof window === "undefined") return [];
  const entry: RecentPlace = {
    label: place.label?.trim() || shortLabel(place.formatted),
    formatted: place.formatted,
    latitude: place.latitude,
    longitude: place.longitude,
    at: Date.now(),
  };
  const kept = readRecentPlaces().filter(
    (row) =>
      row.formatted !== entry.formatted &&
      (Math.abs(row.latitude - entry.latitude) > 0.0004 ||
        Math.abs(row.longitude - entry.longitude) > 0.0004),
  );
  const next = [entry, ...kept].slice(0, LIMIT);
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* storage unavailable */
  }
  return next;
}
