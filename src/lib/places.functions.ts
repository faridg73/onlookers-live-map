// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit.server";
import { safeQuery } from "@/lib/sanitize";

/** Called directly with the project's own Places key, so no shared gateway quota applies. */
const PLACES_BASE = "https://places.googleapis.com";

export type NearbyPlace = {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  primaryType: string | null;
};

/** A place surfaced in the browse/discovery screens. */
export type DiscoveredPlace = {
  id: string;
  name: string;
  address: string | null;
  latitude: number;
  longitude: number;
  primaryType: string | null;
  rating: number | null;
  ratingCount: number | null;
  /** Google photo resource name, used to load a thumbnail. */
  photoName: string | null;
};

type RawPlace = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  primaryTypeDisplayName?: { text?: string };
  location?: { latitude?: number; longitude?: number };
  rating?: number;
  userRatingCount?: number;
  photos?: Array<{ name?: string }>;
};

const DISCOVERY_FIELDS =
  "places.id,places.displayName,places.formattedAddress,places.location,places.primaryTypeDisplayName,places.rating,places.userRatingCount,places.photos";

const venueSearchSchema = z.object({
  query: safeQuery(120, 2),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  maxResults: z.number().int().min(1).max(8).default(6),
});


function credentials() {
  const mapsKey = process.env["GOOGLE_PLACES_SERVER_KEY"];
  if (!mapsKey) return null;
  return { mapsKey };
}

/** Auth + field-mask headers for a direct Places API (New) call. */
function placesHeaders(mapsKey: string, fieldMask: string, json = false) {
  return {
    "X-Goog-Api-Key": mapsKey,
    "X-Goog-FieldMask": fieldMask,
    ...(json ? { "Content-Type": "application/json" } : {}),
  };
}

function toDiscovered(raw: RawPlace): DiscoveredPlace[] {
  const lat = raw.location?.latitude;
  const lng = raw.location?.longitude;
  const name = raw.displayName?.text;
  if (!raw.id || !name || typeof lat !== "number" || typeof lng !== "number") return [];
  return [
    {
      id: raw.id,
      name,
      address: raw.formattedAddress ?? null,
      latitude: lat,
      longitude: lng,
      primaryType: raw.primaryTypeDisplayName?.text ?? null,
      rating: typeof raw.rating === "number" ? raw.rating : null,
      ratingCount: typeof raw.userRatingCount === "number" ? raw.userRatingCount : null,
      photoName: raw.photos?.[0]?.name ?? null,
    },
  ];
}

/** Bounded, authenticated text search for the app-owned request venue picker. */
export const searchRequestVenues = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => venueSearchSchema.parse(data))
  .handler(async ({ data, context }): Promise<DiscoveredPlace[]> => {
    await enforceRateLimit(RATE_LIMITS.placesSearch, context.userId);
    const creds = credentials();
    if (!creds) throw new Error("Venue search is not configured.");
    const hasBias = typeof data.latitude === "number" && typeof data.longitude === "number";
    const response = await fetch(`${PLACES_BASE}/v1/places:searchText`, {
      method: "POST",
      headers: placesHeaders(creds.mapsKey, DISCOVERY_FIELDS, true),
      body: JSON.stringify({
        textQuery: data.query,
        pageSize: data.maxResults,
        ...(hasBias
          ? {
              locationBias: {
                circle: {
                  center: { latitude: data.latitude, longitude: data.longitude },
                  radius: 40000,
                },
              },
            }
          : {}),
      }),
    });
    if (response.status === 403) {
      const body = await response.text();
      console.error(`[places] request venue search denied [403]: ${body}`);
      throw new Error("Venue search was denied. Check the Google Maps server key restrictions.");
    }
    if (!response.ok) {
      const body = await response.text();
      console.error(`[places] request venue search failed [${response.status}]: ${body}`);
      throw new Error(`Venue search failed [${response.status}]: ${body}`);
    }
    const payload = (await response.json()) as { places?: RawPlace[] };
    return (payload.places ?? []).flatMap(toDiscovered);
  });

const categorySchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  radiusMeters: z.number().min(500).max(40000).default(15000),
  includedTypes: z.array(z.string().min(2).max(50)).min(1).max(6),
  maxResults: z.number().int().min(1).max(20).default(12),
});

/**
 * Popular places of the requested kinds around the area the person is browsing,
 * so Chicago users get Chicago spots and LA users get LA spots.
 */
export const searchPlacesByCategory = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => categorySchema.parse(data))
  .handler(async ({ data }): Promise<{ places: DiscoveredPlace[]; unavailable: boolean }> => {
    const cacheMod = await import("@/lib/venue-cache.server");
    const key = cacheMod.venueCacheKey("category", data.latitude, data.longitude, [
      [...data.includedTypes].sort(),
      data.radiusMeters,
      data.maxResults,
    ]);
    const cached = await cacheMod.readVenueCache(key);
    if (cached?.fresh) return { places: cached.places, unavailable: false };
    // If Google fails, older shared results are better than an empty list.
    const stale = () =>
      cached ? { places: cached.places, unavailable: false } : { places: [], unavailable: true };

    await enforceRateLimit(RATE_LIMITS.placesSearch);
    const creds = credentials();
    if (!creds) return stale();

    const response = await fetch(`${PLACES_BASE}/v1/places:searchNearby`, {
      method: "POST",
      headers: placesHeaders(creds.mapsKey, DISCOVERY_FIELDS, true),
      body: JSON.stringify({
        includedTypes: data.includedTypes,
        maxResultCount: data.maxResults,
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: data.latitude, longitude: data.longitude },
            radius: data.radiusMeters,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[places] category search failed [${response.status}]: ${body}`);
      return stale();
    }

    const payload = (await response.json()) as { places?: RawPlace[] };
    const places = (payload.places ?? []).flatMap(toDiscovered);
    await cacheMod.writeVenueCache(key, places);
    return { places, unavailable: false };
  });

/** Details for one place, used when opening a live place page. */
export const fetchPlaceById = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ placeId: z.string().min(3).max(300) }).parse(data))
  .handler(async ({ data }): Promise<DiscoveredPlace | null> => {
    const creds = credentials();
    if (!creds) return null;

    const response = await fetch(
      `${PLACES_BASE}/v1/places/${encodeURIComponent(data.placeId)}`,
      {
        headers: placesHeaders(
          creds.mapsKey,
          "id,displayName,formattedAddress,location,primaryTypeDisplayName,rating,userRatingCount,photos",
        ),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.error(`[places] details failed [${response.status}]: ${body}`);
      return null;
    }

    const raw = (await response.json()) as RawPlace;
    return toDiscovered(raw)[0] ?? null;
  });

const inputSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /** Search radius in metres, capped so a single view stays cheap. */
  radiusMeters: z.number().min(50).max(3000).default(800),
});

/**
 * Businesses and points of interest inside the current map view.
 * Runs on the server so the browser never calls the Places API directly.
 */
export const fetchNearbyPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<NearbyPlace[]> => {
    const lovableKey = process.env["LOVABLE_API_KEY"];
    const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
    if (!lovableKey || !mapsKey) return [];

    const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "places.id,places.displayName,places.location,places.primaryTypeDisplayName",
      },
      body: JSON.stringify({
        maxResultCount: 20,
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: data.latitude, longitude: data.longitude },
            radius: data.radiusMeters,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[places] nearby search failed [${response.status}]: ${body}`);
      return [];
    }

    const payload = (await response.json()) as {
      places?: Array<{
        id?: string;
        displayName?: { text?: string };
        primaryTypeDisplayName?: { text?: string };
        location?: { latitude?: number; longitude?: number };
      }>;
    };

    return (payload.places ?? []).flatMap((place) => {
      const lat = place.location?.latitude;
      const lng = place.location?.longitude;
      const name = place.displayName?.text;
      if (!place.id || !name || typeof lat !== "number" || typeof lng !== "number") return [];
      return [
        {
          id: place.id,
          name,
          latitude: lat,
          longitude: lng,
          primaryType: place.primaryTypeDisplayName?.text ?? null,
        },
      ];
    });
  });

const mapAreaSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /** Radius of the visible map area, capped so one view stays cheap. */
  radiusMeters: z.number().min(50).max(5000).default(1200),
  maxResults: z.number().int().min(1).max(20).default(20),
});

/**
 * Real businesses inside the current map view, with names, ratings and
 * addresses, so panning or searching shows what is actually there.
 */
export const fetchMapAreaPlaces = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => mapAreaSchema.parse(data))
  .handler(async ({ data }): Promise<DiscoveredPlace[]> => {
    await enforceRateLimit(RATE_LIMITS.placesSearch);
    const creds = credentials();
    if (!creds) return [];

    const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchNearby`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.lovableKey}`,
        "X-Connection-Api-Key": creds.mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": DISCOVERY_FIELDS,
      },
      body: JSON.stringify({
        maxResultCount: data.maxResults,
        rankPreference: "POPULARITY",
        locationRestriction: {
          circle: {
            center: { latitude: data.latitude, longitude: data.longitude },
            radius: data.radiusMeters,
          },
        },
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      console.error(`[places] map area search failed [${response.status}]: ${body}`);
      return [];
    }

    const payload = (await response.json()) as { places?: RawPlace[] };
    return (payload.places ?? []).flatMap(toDiscovered);
  });

const photoSchema = z.object({
  photoNames: z.array(z.string().min(5).max(600)).min(1).max(16),
  maxWidthPx: z.number().int().min(120).max(1200).default(480),
});

/**
 * Short-lived thumbnail URLs for place photos, keyed by photo resource name.
 * Google's media endpoint is called server-side so the key stays private.
 */
export const fetchPlacePhotoUrls = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => photoSchema.parse(data))
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const { readSharedCacheMany, writeSharedCache, PHOTO_CACHE_TTL_MS } = await import("@/lib/venue-cache.server");
    const keyOf = (n: string) => `photo|${data.maxWidthPx}|${n}`;
    const cached = await readSharedCacheMany<string>(data.photoNames.map(keyOf), PHOTO_CACHE_TTL_MS);
    const result: Record<string, string> = {};
    const missing: string[] = [];
    for (const n of data.photoNames) {
      const hit = cached.get(keyOf(n));
      if (hit && typeof hit.value === "string") result[n] = hit.value;
      if (!hit?.fresh) missing.push(n);
    }
    if (!missing.length) return result;

    const creds = credentials();
    if (!creds) return result;

    const entries = await Promise.all(
      missing.map(async (photoName) => {
        try {
          const response = await fetch(
            `${GATEWAY_URL}/places/v1/${photoName}/media?maxWidthPx=${data.maxWidthPx}&skipHttpRedirect=true`,
            {
              headers: {
                Authorization: `Bearer ${creds.lovableKey}`,
                "X-Connection-Api-Key": creds.mapsKey,
              },
            },
          );
          if (!response.ok) return null;
          const payload = (await response.json()) as { photoUri?: string };
          return payload.photoUri ? ([photoName, payload.photoUri] as const) : null;
        } catch (error) {
          console.error("[places] photo lookup failed", error);
          return null;
        }
      }),
    );

    const fetched = entries.filter((entry): entry is readonly [string, string] => !!entry);
    await writeSharedCache(fetched.map(([n, uri]) => ({ key: keyOf(n), value: uri })));
    for (const [n, uri] of fetched) result[n] = uri;
    return result;
  });

const textSchema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  query: z.enum(["coworking space", "startup incubator", "makerspace"]),
  maxResults: z.number().int().min(1).max(20).default(12),
});

/** Public text search for fixed discovery phrases (e.g. coworking) near the browsing area. */
export const searchPlacesByPhrase = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => textSchema.parse(data))
  .handler(async ({ data }): Promise<DiscoveredPlace[]> => {
    const cacheMod = await import("@/lib/venue-cache.server");
    const key = cacheMod.venueCacheKey("phrase", data.latitude, data.longitude, [data.query, data.maxResults]);
    const cached = await cacheMod.readVenueCache(key);
    if (cached?.fresh) return cached.places;

    await enforceRateLimit(RATE_LIMITS.placesSearch);
    const creds = credentials();
    if (!creds) return cached?.places ?? [];
    const response = await fetch(`${GATEWAY_URL}/places/v1/places:searchText`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${creds.lovableKey}`,
        "X-Connection-Api-Key": creds.mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask": DISCOVERY_FIELDS,
      },
      body: JSON.stringify({
        textQuery: data.query,
        pageSize: data.maxResults,
        locationBias: {
          circle: { center: { latitude: data.latitude, longitude: data.longitude }, radius: 30000 },
        },
      }),
    });
    if (!response.ok) {
      console.error(`[places] phrase search failed [${response.status}]: ${await response.text()}`);
      return cached?.places ?? [];
    }
    const payload = (await response.json()) as { places?: RawPlace[] };
    const places = (payload.places ?? []).flatMap(toDiscovered);
    await cacheMod.writeVenueCache(key, places);
    return places;
  });
