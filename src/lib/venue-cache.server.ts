// Shared venue cache: every visitor in the same area/category reuses one Google lookup.
import type { DiscoveredPlace } from "@/lib/places.functions";

/** Cached results stay fresh this long before a new Google lookup. */
export const VENUE_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

/** Snap to a ~5 km grid so nearby visitors in one city share an entry. */
const snap = (n: number) => (Math.round(n * 20) / 20).toFixed(2);

export function venueCacheKey(kind: string, lat: number, lng: number, parts: unknown[]): string {
  return [kind, snap(lat), snap(lng), ...parts.map((p) => JSON.stringify(p))].join("|");
}

async function admin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export async function readVenueCache(
  key: string,
): Promise<{ places: DiscoveredPlace[]; fresh: boolean } | null> {
  try {
    const db = await admin();
    const { data } = await db
      .from("venue_cache")
      .select("places, fetched_at")
      .eq("cache_key", key)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    return { places: data.places as unknown as DiscoveredPlace[], fresh: age < VENUE_CACHE_TTL_MS };
  } catch (e) {
    console.error("[venue-cache] read failed", e);
    return null;
  }
}

export async function writeVenueCache(key: string, places: DiscoveredPlace[]): Promise<void> {
  try {
    const db = await admin();
    await db
      .from("venue_cache")
      .upsert({ cache_key: key, places: places as never, fetched_at: new Date().toISOString() });
  } catch (e) {
    console.error("[venue-cache] write failed", e);
  }
}

/** Generic shared cache on the same table for photo links and city lookups. */
export async function readSharedCache<T>(key: string, ttlMs: number): Promise<{ value: T; fresh: boolean } | null> {
  try {
    const db = await admin();
    const { data } = await db.from("venue_cache").select("places, fetched_at").eq("cache_key", key).maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.fetched_at).getTime();
    return { value: data.places as unknown as T, fresh: age < ttlMs };
  } catch (e) {
    console.error("[shared-cache] read failed", e);
    return null;
  }
}

export async function readSharedCacheMany<T>(keys: string[], ttlMs: number): Promise<Map<string, { value: T; fresh: boolean }>> {
  const out = new Map<string, { value: T; fresh: boolean }>();
  if (!keys.length) return out;
  try {
    const db = await admin();
    const { data } = await db.from("venue_cache").select("cache_key, places, fetched_at").in("cache_key", keys);
    for (const row of data ?? []) {
      const age = Date.now() - new Date(row.fetched_at).getTime();
      out.set(row.cache_key, { value: row.places as unknown as T, fresh: age < ttlMs });
    }
  } catch (e) {
    console.error("[shared-cache] batch read failed", e);
  }
  return out;
}

export async function writeSharedCache(entries: Array<{ key: string; value: unknown }>): Promise<void> {
  if (!entries.length) return;
  try {
    const db = await admin();
    const now = new Date().toISOString();
    await db.from("venue_cache").upsert(entries.map((e) => ({ cache_key: e.key, places: e.value as never, fetched_at: now })));
  } catch (e) {
    console.error("[shared-cache] write failed", e);
  }
}

export const PHOTO_CACHE_TTL_MS = 24 * 60 * 60 * 1000;
export const CITY_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
export const SUGGEST_CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
