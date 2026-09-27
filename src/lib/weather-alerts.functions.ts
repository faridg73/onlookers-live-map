// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** Active NOAA/NWS alert for a GPS point (free, official, no key). */
export type WeatherAlert = {
  id: string;
  event: string;
  headline: string | null;
  severity: string | null;
  areaDesc: string | null;
  ends: string | null;
  url: string | null;
};

type NwsFeature = {
  id?: string;
  properties?: {
    event?: string;
    headline?: string;
    severity?: string;
    areaDesc?: string;
    ends?: string | null;
    expires?: string | null;
    "@id"?: string;
  };
};

export const fetchWeatherAlerts = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }).parse(data),
  )
  .handler(async ({ data }): Promise<WeatherAlert[]> => {
    const point = `${data.latitude.toFixed(4)},${data.longitude.toFixed(4)}`;
    try {
      const response = await fetch(`https://api.weather.gov/alerts/active?point=${point}`, {
        headers: { "User-Agent": "Onlooker (support@onlooker.io)", Accept: "application/geo+json" },
      });
      if (!response.ok) {
        console.error(`[nws] alerts failed [${response.status}]`);
        return [];
      }
      const payload = (await response.json()) as { features?: NwsFeature[] };
      return (payload.features ?? []).slice(0, 5).map((f, i) => ({
        id: f.id ?? `alert-${i}`,
        event: f.properties?.event ?? "Weather alert",
        headline: f.properties?.headline ?? null,
        severity: f.properties?.severity ?? null,
        areaDesc: f.properties?.areaDesc ?? null,
        ends: f.properties?.ends ?? f.properties?.expires ?? null,
        url: f.properties?.["@id"] ?? f.id ?? null,
      }));
    } catch (error) {
      console.error("[nws] alerts lookup failed", error);
      return [];
    }
  });
