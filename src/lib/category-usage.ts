/**
 * Lightweight local (device-only) tap tracking for the Home explore drawer
 * category grid. Stores timestamps in localStorage and keeps a rolling
 * 7-day window so the grid can subtly favour the categories a person
 * actually uses, without any server round-trip.
 */

const STORAGE_KEY = "onlooker.category-taps.v1";
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/** Safety-critical lanes that always stay at the top of the grid. */
export const PINNED_CATEGORY_IDS = ["emergencies", "crime"] as const;

export type CategoryTapLog = Record<string, number[]>;

function readLog(): CategoryTapLog {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const out: CategoryTapLog = {};
    for (const [id, value] of Object.entries(parsed as Record<string, unknown>)) {
      if (Array.isArray(value)) {
        out[id] = value.filter((n): n is number => typeof n === "number");
      }
    }
    return out;
  } catch {
    return {};
  }
}

function prune(log: CategoryTapLog, now = Date.now()): CategoryTapLog {
  const cutoff = now - WINDOW_MS;
  const out: CategoryTapLog = {};
  for (const [id, stamps] of Object.entries(log)) {
    const kept = stamps.filter((stamp) => stamp >= cutoff).slice(-100);
    if (kept.length) out[id] = kept;
  }
  return out;
}

function write(log: CategoryTapLog) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(log));
  } catch {
    // storage unavailable (private mode / quota) — tracking is best effort
  }
}

/** Tap counts per category id inside the rolling 7-day window. */
export function readCategoryTapCounts(): Record<string, number> {
  const log = prune(readLog());
  const counts: Record<string, number> = {};
  for (const [id, stamps] of Object.entries(log)) counts[id] = stamps.length;
  return counts;
}

/** Record one tap and return the refreshed counts. */
export function recordCategoryTap(id: string): Record<string, number> {
  const log = prune(readLog());
  log[id] = [...(log[id] ?? []), Date.now()];
  write(log);
  const counts: Record<string, number> = {};
  for (const [key, stamps] of Object.entries(log)) counts[key] = stamps.length;
  return counts;
}

/**
 * Subtly re-order tiles: pinned safety lanes first (in their original order),
 * then the rest by 7-day tap frequency, ties broken by original position.
 */
export function sortCategoriesByUsage<T extends { id: string }>(
  tiles: readonly T[],
  counts: Record<string, number>,
): T[] {
  const pinned = PINNED_CATEGORY_IDS as readonly string[];
  return [...tiles]
    .map((tile, index) => ({ tile, index }))
    .sort((a, b) => {
      const aPinned = pinned.indexOf(a.tile.id);
      const bPinned = pinned.indexOf(b.tile.id);
      if (aPinned !== -1 || bPinned !== -1) {
        if (aPinned === -1) return 1;
        if (bPinned === -1) return -1;
        return aPinned - bPinned;
      }
      const diff = (counts[b.tile.id] ?? 0) - (counts[a.tile.id] ?? 0);
      if (diff !== 0) return diff;
      return a.index - b.index;
    })
    .map((entry) => entry.tile);
}
