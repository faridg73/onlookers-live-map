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
