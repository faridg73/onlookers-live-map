import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

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


function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) return null;
  return { lovableKey, mapsKey };
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
  .handler(async ({ data }): Promise<DiscoveredPlace[]> => {
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
      return [];
    }

    const payload = (await response.json()) as { places?: RawPlace[] };
    return (payload.places ?? []).flatMap(toDiscovered);
  });

/** Details for one place, used when opening a live place page. */
export const fetchPlaceById = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ placeId: z.string().min(3).max(300) }).parse(data))
  .handler(async ({ data }): Promise<DiscoveredPlace | null> => {
    const creds = credentials();
    if (!creds) return null;

    const response = await fetch(
      `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(data.placeId)}`,
      {
        headers: {
          Authorization: `Bearer ${creds.lovableKey}`,
          "X-Connection-Api-Key": creds.mapsKey,
          "X-Goog-FieldMask":
            "id,displayName,formattedAddress,location,primaryTypeDisplayName,rating,userRatingCount",
        },
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
