// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Server-side check that a bounty's event reference points at a real listed
 * event. The caller only sends an event id; whether the bounty is "event-tied"
 * (and therefore gets the show-footage block) is decided here, never by a
 * client-sent flag. Free and paid events are treated the same.
 */

export type EventVerdict = "listed" | "not_found" | "unverifiable";

const ID_PATTERN = /^(tm|sg|eb|onlooker)-([A-Za-z0-9_.-]{1,120})$/;

async function providerStatus(url: string, init?: RequestInit): Promise<EventVerdict> {
  try {
    const response = await fetch(url, { ...init, headers: { Accept: "application/json", ...(init?.headers ?? {}) } });
    if (response.ok) return "listed";
    if (response.status === 404 || response.status === 400) return "not_found";
    return "unverifiable";
  } catch {
    return "unverifiable";
  }
}

export async function verifyListedEvent(eventId: string): Promise<EventVerdict> {
  const match = ID_PATTERN.exec(eventId);
  if (!match) return "not_found";
  const [, prefix, raw] = match;
  const id = encodeURIComponent(raw!);

  if (prefix === "tm") {
    const key = process.env["TICKETMASTER_API_KEY"];
    if (!key) return "unverifiable";
    return providerStatus(`https://app.ticketmaster.com/discovery/v2/events/${id}.json?apikey=${encodeURIComponent(key)}`);
  }
  if (prefix === "sg") {
    const key = process.env["SEATGEEK_API_KEY"];
    if (!key) return "unverifiable";
    return providerStatus(`https://api.seatgeek.com/2/events/${id}?client_id=${encodeURIComponent(key)}`);
  }
  if (prefix === "eb") {
    const token = process.env["EVENTBRITE_API_KEY"];
    if (!token) return "unverifiable";
    return providerStatus(`https://www.eventbriteapi.com/v3/events/${id}/`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Member-posted events live in community posts with a start time.
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("community_posts")
    .select("id")
    .eq("id", raw!)
    .not("event_starts_at", "is", null)
    .is("hidden_at", null)
    .maybeSingle();
  if (error) return /invalid input syntax/i.test(error.message) ? "not_found" : "unverifiable";
  return data ? "listed" : "not_found";
}
