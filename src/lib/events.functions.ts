import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Unified live-event feed for the Trending screens.
 *
 * Sources and routing:
 * - Ticketmaster Discovery API v2 — major concerts, sports and arena tours.
 * - SeatGeek Platform API v2 — major games, tours and resale-backed listings.
 * - Eventbrite API v3 — local neighbourhood gatherings, pop-ups and meetups.
 *
 * All keys are read inside handlers so they never reach the browser. Every
 * provider link we surface is the provider's own official event page, which is
 * the redirect pattern their terms require; nothing is scraped or re-hosted.
 * Results are cached per area/date window and calls are throttled per provider
 * to stay inside published rate limits (Ticketmaster 5 req/s, SeatGeek and
 * Eventbrite documented per-minute/day quotas).
 */

const TM_URL = "https://app.ticketmaster.com/discovery/v2/events.json";
const SG_URL = "https://api.seatgeek.com/2/events";
const EB_URL = "https://www.eventbriteapi.com/v3";

const CACHE_TTL_MS = 10 * 60 * 1000;

export type EventSource = "ticketmaster" | "seatgeek" | "eventbrite";

/** "major" = arena/stadium scale, "local" = neighbourhood scale. */
export type EventScope = "major" | "local";

export type LiveEvent = {
  id: string;
  source: EventSource;
  scope: EventScope;
  name: string;
  startsAt: string | null;
  localDate: string | null;
  localTime: string | null;
  venueName: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  /** Display tag, e.g. "Concert", "MLB", "Food & Drink". */
  category: string | null;
  imageUrl: string | null;
  /** Official provider event page — the only compliant purchase link. */
  ticketUrl: string;
  priceFrom: number | null;
  currency: string | null;
};

/* ------------------------------------------------------------------ */
/* shared helpers                                                      */
/* ------------------------------------------------------------------ */

const cache = new Map<string, { at: number; events: LiveEvent[] }>();
const lastCallAt: Record<EventSource, number> = {
  ticketmaster: 0,
  seatgeek: 0,
  eventbrite: 0,
};
const MIN_GAP_MS: Record<EventSource, number> = {
  ticketmaster: 250, // <= 4 req/s, inside the documented 5 req/s
  seatgeek: 200,
  eventbrite: 300,
};

async function throttle(source: EventSource) {
  const wait = lastCallAt[source] + MIN_GAP_MS[source] - Date.now();
  if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
  lastCallAt[source] = Date.now();
}

/** Providers want second-precision UTC stamps with no milliseconds. */
function stamp(date: Date) {
  return `${date.toISOString().slice(0, 19)}Z`;
}

/** Friday 00:00 through Sunday 23:59 of the current or upcoming weekend. */
function weekendWindow(now: Date) {
  const start = new Date(now);
  const day = start.getUTCDay(); // 0 Sun … 5 Fri, 6 Sat
  const toFriday = day === 0 ? -2 : day === 6 ? -1 : 5 - day;
  start.setUTCDate(start.getUTCDate() + toFriday);
  start.setUTCHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 2);
  end.setUTCHours(23, 59, 0, 0);
  return { start: now > start ? now : start, end };
}

function milesBetween(
  a: { lat: number; lng: number },
  b: { lat: number; lng: number },
): number {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function splitLocal(iso: string | null) {
  if (!iso) return { date: null, time: null };
  const [date, rest] = iso.split("T");
  return { date: date ?? null, time: rest ? rest.slice(0, 5) : null };
}

/* ------------------------------------------------------------------ */
/* Ticketmaster                                                        */
/* ------------------------------------------------------------------ */

type TmEvent = {
  id?: string;
  name?: string;
  url?: string;
  dates?: { start?: { dateTime?: string; localDate?: string; localTime?: string } };
  images?: Array<{ url?: string; width?: number; ratio?: string }>;
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

function tmImage(images: TmEvent["images"]): string | null {
  if (!images?.length) return null;
  const usable = images.filter((image) => !!image.url && (image.width ?? 0) >= 300);
  const wide = usable.find((image) => image.ratio === "16_9") ?? usable[0] ?? images[0];
  return wide?.url ?? null;
}

function mapTicketmaster(raw: TmEvent): LiveEvent[] {
  if (!raw.id || !raw.name || !raw.url) return [];
  const venue = raw._embedded?.venues?.[0];
  const lat = Number(venue?.location?.latitude);
  const lng = Number(venue?.location?.longitude);
  const classification = raw.classifications?.[0];
  const price = raw.priceRanges?.[0];
  return [
    {
      id: `tm-${raw.id}`,
      source: "ticketmaster",
      scope: "major",
      name: raw.name,
      startsAt: raw.dates?.start?.dateTime ?? null,
      localDate: raw.dates?.start?.localDate ?? null,
      localTime: raw.dates?.start?.localTime?.slice(0, 5) ?? null,
      venueName: venue?.name ?? null,
      city: venue?.city?.name ?? null,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      category: classification?.genre?.name ?? classification?.segment?.name ?? null,
      imageUrl: tmImage(raw.images),
      ticketUrl: raw.url,
      priceFrom: typeof price?.min === "number" ? price.min : null,
      currency: price?.currency ?? null,
    },
  ];
}

async function fetchTicketmaster(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  window: { start: Date; end: Date },
  size: number,
): Promise<LiveEvent[]> {
  const apiKey = process.env["TICKETMASTER_API_KEY"];
  if (!apiKey) return [];

  const params = new URLSearchParams({
    apikey: apiKey,
    latlong: `${latitude.toFixed(4)},${longitude.toFixed(4)}`,
    radius: String(radiusMiles),
    unit: "miles",
    startDateTime: stamp(window.start),
    endDateTime: stamp(window.end),
    size: String(size),
    sort: "date,asc",
  });

  try {
    await throttle("ticketmaster");
    const response = await fetch(`${TM_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.error(`[events] ticketmaster failed [${response.status}]`);
      return [];
    }
    const payload = (await response.json()) as { _embedded?: { events?: TmEvent[] } };
    return (payload._embedded?.events ?? []).flatMap(mapTicketmaster);
  } catch (error) {
    console.error("[events] ticketmaster lookup failed", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* SeatGeek                                                            */
/* ------------------------------------------------------------------ */

type SgEvent = {
  id?: number;
  title?: string;
  url?: string;
  datetime_utc?: string;
  datetime_local?: string;
  type?: string;
  taxonomies?: Array<{ name?: string }>;
  stats?: { lowest_price?: number | null };
  performers?: Array<{ image?: string | null; images?: { huge?: string } }>;
  venue?: {
    name?: string;
    city?: string;
    location?: { lat?: number; lon?: number };
  };
};

function prettyTaxonomy(value?: string | null) {
  if (!value) return null;
  return value
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function mapSeatGeek(raw: SgEvent): LiveEvent[] {
  if (!raw.id || !raw.title || !raw.url) return [];
  const local = splitLocal(raw.datetime_local ?? null);
  const performer = raw.performers?.[0];
  return [
    {
      id: `sg-${raw.id}`,
      source: "seatgeek",
      scope: "major",
      name: raw.title,
      startsAt: raw.datetime_utc ? `${raw.datetime_utc.replace(" ", "T")}Z` : null,
      localDate: local.date,
      localTime: local.time,
      venueName: raw.venue?.name ?? null,
      city: raw.venue?.city ?? null,
      latitude: typeof raw.venue?.location?.lat === "number" ? raw.venue.location.lat : null,
      longitude: typeof raw.venue?.location?.lon === "number" ? raw.venue.location.lon : null,
      category: prettyTaxonomy(raw.taxonomies?.[0]?.name ?? raw.type ?? null),
      imageUrl: performer?.images?.huge ?? performer?.image ?? null,
      ticketUrl: raw.url,
      priceFrom: typeof raw.stats?.lowest_price === "number" ? raw.stats.lowest_price : null,
      currency: typeof raw.stats?.lowest_price === "number" ? "USD" : null,
    },
  ];
}

async function fetchSeatGeek(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  window: { start: Date; end: Date },
  size: number,
): Promise<LiveEvent[]> {
  const clientId = process.env["SEATGEEK_API_KEY"];
  if (!clientId) return [];

  const params = new URLSearchParams({
    client_id: clientId,
    lat: latitude.toFixed(4),
    lon: longitude.toFixed(4),
    range: `${radiusMiles}mi`,
    "datetime_utc.gte": stamp(window.start).slice(0, 19),
    "datetime_utc.lte": stamp(window.end).slice(0, 19),
    per_page: String(size),
    sort: "datetime_utc.asc",
  });

  try {
    await throttle("seatgeek");
    const response = await fetch(`${SG_URL}?${params.toString()}`, {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) {
      console.error(`[events] seatgeek failed [${response.status}]`);
      return [];
    }
    const payload = (await response.json()) as { events?: SgEvent[] };
    return (payload.events ?? []).flatMap(mapSeatGeek);
  } catch (error) {
    console.error("[events] seatgeek lookup failed", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Eventbrite — local gatherings                                       */
/* ------------------------------------------------------------------ */

type EbEvent = {
  id?: string;
  name?: { text?: string };
  url?: string;
  start?: { utc?: string; local?: string };
  logo?: { url?: string; original?: { url?: string } };
  category?: { name?: string };
  venue?: {
    name?: string;
    address?: {
      city?: string;
      latitude?: string;
      longitude?: string;
      localized_address_display?: string;
    };
  };
};

function mapEventbrite(raw: EbEvent): LiveEvent[] {
  if (!raw.id || !raw.name?.text || !raw.url) return [];
  const local = splitLocal(raw.start?.local ?? null);
  const lat = Number(raw.venue?.address?.latitude);
  const lng = Number(raw.venue?.address?.longitude);
  return [
    {
      id: `eb-${raw.id}`,
      source: "eventbrite",
      scope: "local",
      name: raw.name.text,
      startsAt: raw.start?.utc ?? null,
      localDate: local.date,
      localTime: local.time,
      venueName: raw.venue?.name ?? raw.venue?.address?.localized_address_display ?? null,
      city: raw.venue?.address?.city ?? null,
      latitude: Number.isFinite(lat) ? lat : null,
      longitude: Number.isFinite(lng) ? lng : null,
      category: raw.category?.name ?? "Community",
      imageUrl: raw.logo?.original?.url ?? raw.logo?.url ?? null,
      ticketUrl: raw.url,
      priceFrom: null,
      currency: null,
    },
  ];
}

/**
 * Eventbrite retired its public event-search endpoint, so the compliant path is
 * the organizations the connected token can read. Events are filtered to the
 * browsing area and weekend window on our side.
 */
async function fetchEventbrite(
  latitude: number,
  longitude: number,
  radiusMiles: number,
  window: { start: Date; end: Date },
  size: number,
): Promise<LiveEvent[]> {
  const token = process.env["EVENTBRITE_API_KEY"];
  if (!token) return [];
  const headers = { Authorization: `Bearer ${token}`, Accept: "application/json" };

  try {
    await throttle("eventbrite");
    const orgResponse = await fetch(`${EB_URL}/users/me/organizations/`, { headers });
    if (!orgResponse.ok) {
      console.error(`[events] eventbrite organizations failed [${orgResponse.status}]`);
      return [];
    }
    const orgs = (await orgResponse.json()) as { organizations?: Array<{ id?: string }> };
    const orgIds = (orgs.organizations ?? [])
      .map((org) => org.id)
      .filter((id): id is string => !!id)
      .slice(0, 3);

    const pages = await Promise.all(
      orgIds.map(async (orgId) => {
        await throttle("eventbrite");
        const params = new URLSearchParams({
          expand: "venue,category",
          status: "live",
          order_by: "start_asc",
          "start_date.range_start": stamp(window.start),
          "start_date.range_end": stamp(window.end),
        });
        const response = await fetch(
          `${EB_URL}/organizations/${orgId}/events/?${params.toString()}`,
          { headers },
        );
        if (!response.ok) {
          console.error(`[events] eventbrite events failed [${response.status}]`);
          return [] as LiveEvent[];
        }
        const payload = (await response.json()) as { events?: EbEvent[] };
        return (payload.events ?? []).flatMap(mapEventbrite);
      }),
    );

    return pages
      .flat()
      .filter(
        (event) =>
          event.latitude === null ||
          event.longitude === null ||
          milesBetween(
            { lat: latitude, lng: longitude },
            { lat: event.latitude, lng: event.longitude },
          ) <= radiusMiles,
      )
      .slice(0, size);
  } catch (error) {
    console.error("[events] eventbrite lookup failed", error);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* unified server function                                             */
/* ------------------------------------------------------------------ */

const schema = z.object({
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  /** Search radius in miles, capped to provider maximums. */
  radiusMiles: z.number().int().min(1).max(200).default(50),
  /** Limit to the upcoming weekend instead of the next 30 days. */
  weekendOnly: z.boolean().default(true),
  /** "major" = arena scale only, "local" = neighbourhood only, "all" = both. */
  scope: z.enum(["all", "major", "local"]).default("all"),
  size: z.number().int().min(1).max(50).default(18),
});

/**
 * Live events around the area someone is browsing, merged across providers and
 * sorted by start time. Always resolves (never throws) so the Trending feed
 * renders even when a provider key is missing or a provider is down.
 */
export const fetchTrendingEvents = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => schema.parse(data))
  .handler(async ({ data }): Promise<LiveEvent[]> => {
    const now = new Date();
    const window = data.weekendOnly
      ? weekendWindow(now)
      : { start: now, end: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) };

    const cacheKey = [
      data.latitude.toFixed(2),
      data.longitude.toFixed(2),
      data.radiusMiles,
      data.weekendOnly ? "weekend" : "month",
      data.scope,
      data.size,
      window.start.toISOString().slice(0, 13),
    ].join(":");

    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < CACHE_TTL_MS) return hit.events;

    const wantMajor = data.scope !== "local";
    const wantLocal = data.scope !== "major";

    const [ticketmaster, seatgeek, eventbrite] = await Promise.all([
      wantMajor
        ? fetchTicketmaster(data.latitude, data.longitude, data.radiusMiles, window, data.size)
        : Promise.resolve([]),
      wantMajor
        ? fetchSeatGeek(data.latitude, data.longitude, data.radiusMiles, window, data.size)
        : Promise.resolve([]),
      wantLocal
        ? fetchEventbrite(data.latitude, data.longitude, data.radiusMiles, window, data.size)
        : Promise.resolve([]),
    ]);

    // Same show listed by two ticket sellers: keep the first by name + date.
    const seen = new Set<string>();
    const merged: LiveEvent[] = [];
    for (const event of [...ticketmaster, ...seatgeek, ...eventbrite]) {
      const dedupe = `${event.name.toLowerCase().replace(/[^a-z0-9]/g, "")}:${event.localDate ?? ""}`;
      if (seen.has(dedupe)) continue;
      seen.add(dedupe);
      merged.push(event);
    }

    merged.sort((a, b) => (a.startsAt ?? "").localeCompare(b.startsAt ?? ""));
    const events = merged.slice(0, data.size);
    cache.set(cacheKey, { at: Date.now(), events });
    return events;
  });
