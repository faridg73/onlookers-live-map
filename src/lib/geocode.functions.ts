// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit.server";
import { safeQuery } from "@/lib/sanitize";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";
const MAP_RATE_LIMIT_COOLDOWN_MS = 15 * 60 * 1000;

let mapRateLimitedUntil = 0;

export type GeocodeResult = {
  latitude: number;
  longitude: number;
  formatted: string;
};

function credentials() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const mapsKey = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovableKey || !mapsKey) throw new Error("Map lookup is not configured.");
  return { lovableKey, mapsKey };
}

function mapLookupIsCoolingDown() {
  return Date.now() < mapRateLimitedUntil;
}

function handleRateLimitedResponse(response: Response) {
  if (response.status !== 429) return false;
  mapRateLimitedUntil = Date.now() + MAP_RATE_LIMIT_COOLDOWN_MS;
  console.warn("Google Maps lookups are rate limited; pausing new lookups for 15 minutes.");
  return true;
}

async function callGeocode(params: Record<string, string>): Promise<GeocodeResult | null> {
  if (mapLookupIsCoolingDown()) return null;
  const { lovableKey, mapsKey } = credentials();
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${GATEWAY_URL}/maps/api/geocode/json?${query}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
    },
  });

  if (handleRateLimitedResponse(response)) return null;
  if (response.status === 403) {
    throw new Error("Map lookup was denied. Check the map key restrictions.");
  }
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Map lookup failed [${response.status}]: ${body}`);
  }

  const payload = (await response.json()) as {
    status?: string;
    results?: Array<{
      formatted_address?: string;
      geometry?: { location?: { lat?: number; lng?: number } };
    }>;
  };

  const first = payload.results?.[0];
  const lat = first?.geometry?.location?.lat;
  const lng = first?.geometry?.location?.lng;
  if (typeof lat !== "number" || typeof lng !== "number") return null;

  return { latitude: lat, longitude: lng, formatted: first?.formatted_address ?? "" };
}

/** Turns a typed address into coordinates for the mini preview map. */
export const geocodeAddress = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => z.object({ address: safeQuery(200, 3) }).parse(data))
  .handler(async ({ data }): Promise<GeocodeResult | null> => {
    await enforceRateLimit(RATE_LIMITS.geocode);
    return callGeocode({ address: data.address });
  });

/** Turns a dropped pin back into a street address. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse(data),
  )
  .handler(async ({ data }): Promise<GeocodeResult | null> => {
    await enforceRateLimit(RATE_LIMITS.geocode);
    return callGeocode({ latlng: `${data.latitude},${data.longitude}` });
  });

export type PlaceSuggestion = {
  placeId: string;
  text: string;
};

/** Live city/state autocomplete suggestions for the filter bar search. */
export const autocompletePlaces = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        input: safeQuery(120, 2),
        sessionToken: z.string().uuid(),
        // "areas" keeps results to cities/regions; "all" also returns landmarks,
        // venues and street addresses.
        scope: z.enum(["areas", "all"]).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<PlaceSuggestion[]> => {
    await enforceRateLimit(RATE_LIMITS.geocode);
    if (mapLookupIsCoolingDown()) return [];
    const { lovableKey, mapsKey } = credentials();
    const response = await fetch(`${GATEWAY_URL}/places/v1/places:autocomplete`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": mapsKey,
        "Content-Type": "application/json",
        "X-Goog-FieldMask":
          "suggestions.placePrediction.placeId,suggestions.placePrediction.text.text,suggestions.placePrediction.types",
      },
      body: JSON.stringify({
        input: data.input,
        sessionToken: data.sessionToken,
        ...(data.scope === "all"
          ? {}
          : {
              includedPrimaryTypes: [
                "locality",
                "administrative_area_level_1",
                "administrative_area_level_2",
              ],
            }),
      }),
    });

    if (handleRateLimitedResponse(response)) return [];
    if (response.status === 403) {
      throw new Error("Map lookup was denied. Check the map key restrictions.");
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Map lookup failed [${response.status}]: ${body}`);
    }

    const payload = (await response.json()) as {
      suggestions?: Array<{
        placePrediction?: { placeId?: string; text?: { text?: string } };
      }>;
    };

    return (payload.suggestions ?? [])
      .map((s) => ({ placeId: s.placePrediction?.placeId ?? "", text: s.placePrediction?.text?.text ?? "" }))
      .filter((s) => s.placeId && s.text)
      .slice(0, 6);
  });

/** Resolves a chosen autocomplete suggestion to coordinates, ending the session. */
export const resolvePlaceSuggestion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ placeId: z.string().trim().min(3).max(300), sessionToken: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }): Promise<GeocodeResult | null> => {
    if (mapLookupIsCoolingDown()) return null;
    const { lovableKey, mapsKey } = credentials();
    const response = await fetch(
      `${GATEWAY_URL}/places/v1/places/${encodeURIComponent(data.placeId)}?sessionToken=${data.sessionToken}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "X-Goog-FieldMask": "location,formattedAddress",
        },
      },
    );

    if (handleRateLimitedResponse(response)) return null;
    if (response.status === 403) {
      throw new Error("Map lookup was denied. Check the map key restrictions.");
    }
    if (!response.ok) {
      const body = await response.text();
      throw new Error(`Map lookup failed [${response.status}]: ${body}`);
    }

    const payload = (await response.json()) as {
      location?: { latitude?: number; longitude?: number };
      formattedAddress?: string;
    };
    const lat = payload.location?.latitude;
    const lng = payload.location?.longitude;
    if (typeof lat !== "number" || typeof lng !== "number") return null;
    return { latitude: lat, longitude: lng, formatted: payload.formattedAddress ?? "" };
  });
