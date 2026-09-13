/**
 * Requests that ask someone to film a screen, a ticket barcode or a broadcast
 * are blocked before they reach the map. Onlooker Live only pays for real,
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
  "Request Blocked: To protect creator rights, Onlooker Live cannot fulfill requests to record third-party apps, digital ticket feeds, or live broadcasts. Please update your request to ask for a physical view (e.g., line lengths, crowd sizes, or seat views).";

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
