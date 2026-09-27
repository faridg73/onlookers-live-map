// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Requests that ask someone to film a screen, a ticket barcode or a broadcast
 * are blocked before they reach the map. Onlooker only pays for real,
 * physical views of a place.
 */
export const FORBIDDEN_TERMS = [
  "ticketmaster",
  "stubhub",
  "live nation",
  "seatgeek",
  "screen record",
  "screenshot",
  "broadcast",
  "livestream feed",
  "ticket barcode",
  "qr code",
] as const;

export const BLOCKED_REQUEST_MESSAGE =
  "Request Blocked: To protect creator rights, Onlooker cannot fulfill requests to record third-party apps, digital ticket feeds, or live broadcasts. Please update your request to ask for a physical view (e.g., line lengths, crowd sizes, or seat views).";

/** Normalises punctuation and spacing so "screen-record!!" still matches. */
function normalise(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Every forbidden term found across the given pieces of text. */
export function findForbiddenTerms(...texts: Array<string | null | undefined>): string[] {
  const haystack = normalise(texts.filter(Boolean).join(" "));
  if (!haystack) return [];
  return FORBIDDEN_TERMS.filter((term) => haystack.includes(normalise(term)));
}

/** True when nothing in the text trips the content filter. */
export function isRequestAllowed(...texts: Array<string | null | undefined>): boolean {
  return findForbiddenTerms(...texts).length === 0;
}

/**
 * Extra phrases blocked only on bounties opened from a ticketed event card.
 * Ticketed events can only be covered from outside: exterior, line, or
 * pre/after-party. Anything asking for the show itself is rejected.
 */
export const EVENT_PERFORMANCE_TERMS = [
  "record the show",
  "film the show",
  "stream the show",
  "the whole show",
  "full show",
  "record the concert",
  "film the concert",
  "stream the concert",
  "the performance",
  "record the performance",
  "the stage",
  "on stage",
  "onstage",
  "the set",
  "the game",
  "the match",
  "the fight",
  "the field",
  "the court",
  "courtside",
  "from my seat",
  "from the seats",
  "inside the arena",
  "inside the stadium",
  "inside the venue",
  "the headliner",
  "the opener",
] as const;

export const EVENT_BLOCKED_MESSAGE =
  "Request Blocked: Bounties tied to ticketed events can only request exterior, line, or pre/after-party footage — never a recording of the performance itself. Remove any mention of the show, stage, game or seats and try again.";

/** Performance-footage phrases found in an event-tied bounty's text. */
export function findEventPerformanceTerms(...texts: Array<string | null | undefined>): string[] {
  const haystack = ` ${normalise(texts.filter(Boolean).join(" "))} `;
  return EVENT_PERFORMANCE_TERMS.filter((term) => haystack.includes(` ${normalise(term)} `));
}
