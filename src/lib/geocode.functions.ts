import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/google_maps";

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

async function callGeocode(params: Record<string, string>): Promise<GeocodeResult | null> {
  const { lovableKey, mapsKey } = credentials();
  const query = new URLSearchParams(params).toString();
  const response = await fetch(`${GATEWAY_URL}/maps/api/geocode/json?${query}`, {
    headers: {
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": mapsKey,
    },
  });

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
  .inputValidator((data: unknown) => z.object({ address: z.string().trim().min(3).max(200) }).parse(data))
  .handler(async ({ data }): Promise<GeocodeResult | null> => callGeocode({ address: data.address }));

/** Turns a dropped pin back into a street address. */
export const reverseGeocode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse(data),
  )
  .handler(async ({ data }): Promise<GeocodeResult | null> => {
    return callGeocode({ latlng: `${data.latitude},${data.longitude}` });
  });
