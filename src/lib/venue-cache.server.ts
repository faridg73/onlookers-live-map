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
