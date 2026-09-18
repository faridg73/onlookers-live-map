import { getRequest } from "@tanstack/react-start/server";

/**
 * Server-side throttling for anything a script could hammer: sign-in attempts,
 * confirmation texts, map searches, posting and checkout. Counters live in the
 * database (`consume_rate_limit`) so they hold across every worker instance.
 *
 * The limiter fails open — if the counter itself is unreachable, real people
 * are never locked out of the app.
 */

export type RateLimitRule = {
  /** Name of the counter, e.g. "auth-attempt". */
  bucket: string;
  /** Attempts allowed inside one window. */
  limit: number;
  /** Length of the window in seconds. */
  windowSeconds: number;
};

export const RATE_LIMITS = {
  /** Sign-in / sign-up attempts from one address. */
  auth: { bucket: "auth-attempt", limit: 6, windowSeconds: 300 },
  /** Human-check verifications from one address. */
  humanCheck: { bucket: "human-check", limit: 40, windowSeconds: 300 },
  /** Confirmation texts per member — SMS costs money. */
  sms: { bucket: "sms-send", limit: 5, windowSeconds: 3600 },
  /** Contact / support tickets. */
  support: { bucket: "support-ticket", limit: 5, windowSeconds: 3600 },
  /** Copyright reports. */
  dmca: { bucket: "dmca-notice", limit: 5, windowSeconds: 3600 },
  /** Address lookups and city/state autocomplete. */
  geocode: { bucket: "geocode", limit: 120, windowSeconds: 300 },
  /** Venue / place searches. */
  placesSearch: { bucket: "places-search", limit: 120, windowSeconds: 300 },
  /** New bounty requests per member. */
  createRequest: { bucket: "create-request", limit: 15, windowSeconds: 3600 },
  /** Bounty acceptances per member. */
  acceptBounty: { bucket: "accept-bounty", limit: 30, windowSeconds: 3600 },
  /** Credit checkout sessions per member. */
  checkout: { bucket: "checkout", limit: 10, windowSeconds: 900 },
  /** Cash-out and payout requests per member and per address. */
  cashout: { bucket: "cashout", limit: 5, windowSeconds: 3600 },
} as const satisfies Record<string, RateLimitRule>;

export const RATE_LIMITED_MESSAGE =
  "That's a lot of tries in a short time. Please wait a minute and try again.";

/** Best-effort caller address, used when there is no signed-in member. */
export function callerAddress(): string {
  const headers = getRequest()?.headers;
  const candidate =
    headers?.get("cf-connecting-ip") ??
    headers?.get("x-real-ip") ??
    headers?.get("x-forwarded-for")?.split(",")[0]?.trim();
  return candidate && candidate.length > 0 ? candidate : "unknown";
}

/** Returns false once the caller has gone over the limit for this window. */
export async function withinRateLimit(
  rule: RateLimitRule,
  identifier?: string,
): Promise<boolean> {
  const key = (identifier ?? callerAddress()).slice(0, 200);
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("consume_rate_limit", {
      _bucket: rule.bucket,
      _identifier: key,
      _limit: rule.limit,
      _window_seconds: rule.windowSeconds,
    });
    if (error) {
      console.error("[rate-limit] counter unavailable", rule.bucket, error.message);
      return true;
    }
    return data !== false;
  } catch (cause) {
    console.error("[rate-limit] counter failed", rule.bucket, cause);
    return true;
  }
}

/** Throws a friendly error once the caller is over the limit. */
export async function enforceRateLimit(
  rule: RateLimitRule,
  identifier?: string,
): Promise<void> {
  if (!(await withinRateLimit(rule, identifier))) {
    throw new Error(RATE_LIMITED_MESSAGE);
  }
}
