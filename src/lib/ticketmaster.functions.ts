import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Official Ticketmaster Discovery API v2.
 * Key stays server-side; the browser only ever sees mapped, display-safe fields.
 * Published rate limits: 5 requests/second and 5,000 requests/day per key, so
 * results are cached in-memory per area/date window and calls are throttled.
 */
const DISCOVERY_URL = "https://app.ticketmaster.com/discovery/v2/events.json";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MIN_GAP_MS = 250; // <= 4 req/s, inside the 5 req/s limit

export type LiveEvent = {
  id: string;
  name: string;
  /** ISO start instant, or null for TBA events. */
  startsAt: string | null;
  /** Human date/time as supplied by Ticketmaster's localDate/localTime. */
  localDate: string | null;
  localTime: string | null;
  venueName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  segment: string | null;
  genre: string | null;
  imageUrl: string | null;
  /** Official Ticketmaster event page — the only compliant purchase link. */
  ticketUrl: string;
  priceFrom: number | null;
  currency: string | null;
};

type RawEvent = {
  id?: string;
  name?: string;
  url?: string;
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string } };
  images?: Array<{ url?: string; width?: number; height?: number; ratio?: string }>;
  classifications?: Array<{ segment?: { name?: string }; genre?: { name?: string } }>;
  priceRanges?: Array<{ min?: number; currency?: string }>;
  _embedded?: {
    venues?: Array<{
      name?: string;
      city?: { name?: string };
      location?: { latitude?: string; longitude?: string };
    }>;
  };
};

const cache = new Map<string, { at: number; events: LiveEvent[] }>();
let lastCallAt = 0;

async function throttle() {
  const wait = lastCallAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCallAt = Date.now();
}

function bestImage(images: RawEvent["images"]): string | null {
  if (!images?.length) return null;
  const usable = images.filter((image) => !!image.url && (image.width ?? 0) >= 300);
  const wide = usable.find((image) => image.ratio === "16_9") ?? usable[0] ?? images[0];
  return wide?.url ?? null;
}

function toEvent(raw: RawEvent): LiveEvent[] {
  const venue = raw._embedded?.venues?.[0];
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  if (!raw.id || !raw.name || !raw.url) return [];
  const classification = raw.classifications?.[0];
  return [
    {
      id: raw.id,
      name: raw.name,
      startsAt: raw.dates?.start?.dateTime ?? null,
      localDate: raw.dates?.start?.localDate ?? null,
      localTime: raw.dates?.start?.localTime ?? null,
      venueName: venue?.name ?? null,
      city: venue?.city?.name ?? null,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      segment: classification?.segment?.name ?? null,
      genre: classification?.genre?.name ?? null,
      imageUrl: bestImage(raw.images),
      ticketUrl: raw.url,
      priceFrom: typeof raw.priceRanges?.[0]?.min === "number" ? raw.priceRanges[0]!.min! : null,
      currency: raw.priceRanges?.[0]?.currency ?? null,
    },
  ];
}

/** Ticketmaster wants second-precision UTC stamps with no milliseconds. */
function stamp(date: Date) {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/** Friday 00:00 through Sunday 23:59 of the current or upcoming weekend. */
function weekendWindow(now: Date) {
  const start = new Date(now);
  const day = start.getUTCDay(); // 0 Sun ... 5 Fri, 6 Sat
  const toFriday = day === 6 || day === 0 ? -(day === 0 ? 2 : 1) : 5 - day;
  start.setUTCDate(start.getUTCDate() + toFriday);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 2);
  end.setUTCHours(23, 59, 0, 0);
  return { start: now > start ? now : start, end };
}

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /** Search radius in miles, capped to Ticketmaster's documented maximum. */
  radiusMiles: z.number().int().min(1).max(500).default(50),
  /** Limit to the upcoming weekend instead of the next 30 days. */
  weekendOnly: z.boolean().default(true),
  size: z.number().int().min(1).max(50).default(20),
  keyword: z.string().max(80).optional(),
});

/**
 * Live ticketed events around the area someone is browsing. Returns an empty
 * list (never an error) when the key is missing or Ticketmaster is unhappy, so
 * the Trending feed always renders.
 */
export const fetchLiveEvents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<LiveEvent[]> => {
    const apiKey = process.env["TICKETMASTER_API_KEY"];
    if (!apiKey) return [];

    const now = new Date();
    const window = data.weekendOnly
      ? weekendWindow(now)
      : { start: now, end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) };

    const cacheKey = [
      data.latitude.toFixed(2),
      data.longitude.toFixed(2),
      data.radiusMiles,
      data.weekendOnly ? "weekend" : "month",
      data.size,
      data.keyword ?? "",
      window.start.toISOString().slice(0, 13),
    ].join(":");

    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.events;

    const params = new URLSearchParams({
      apikey: apiKey,
      latlong: `${data.latitude.toFixed(4)},${data.longitude.toFixed(4)}`,
      radius: String(data.radiusMiles),
      unit: "miles",
      startDateTime: stamp(window.start),
      endDateTime: stamp(window.end),
      size: String(data.size),
      sort: "date,asc",
    });
    if (data.keyword) params.set("keyword", data.keyword);

    try {
      await throttle();
      const response = await fetch(`${DISCOVERY_URL}?${params.toString()}`, {
        headers: { Accept: "application/json" },
      });

      if (response.status === 429) {
        console.error("[ticketmaster] rate limited; serving cached or empty list");
        return hit?.events ?? [];
      }
      if (!response.ok) {
        console.error(`[ticketmaster] events failed [${response.status}]`);
        return hit?.events ?? [];
      }

      const payload = (await response.json()) as { _embedded?: { events?: RawEvent[] } };
      const events = (payload._embedded?.events ?? []).flatMap(toEvent);
      cache.set(cacheKey, { at: Date.now(), events });
      return events;
    } catch (error) {
      console.error("[ticketmaster] lookup failed", error);
      return hit?.events ?? [];
    }
  });
