import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";

/**
 * Cloudflare Turnstile: an almost-invisible human check in front of sign-up
 * and anything that creates public content. The site key is public and handed
 * to the browser; the secret key only ever lives on the server.
 *
 * When the keys are not configured the check quietly stands down so the app
 * keeps working — nothing is silently reported as verified.
 */

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/** Public site key for the browser widget; null when not configured yet. */
export const getTurnstileSiteKey = createServerFn({ method: "GET" }).handler(
  async (): Promise<string | null> => {
    const key = process.env["TURNSTILE_SITE_KEY"];
    return key && key.trim().length > 0 ? key.trim() : null;
  },
);

export type HumanCheckResult = { ok: boolean; configured: boolean; reason?: string };

/** Verifies a Turnstile token with Cloudflare. Safe to call from the browser. */
export const verifyHumanCheck = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().max(4000).default(""),
        action: z.string().trim().max(40).optional(),
      })
      .parse(data),
  )
  .handler(async ({ data }): Promise<HumanCheckResult> => {
    const secret = process.env["TURNSTILE_SECRET_KEY"];
    if (!secret) return { ok: true, configured: false };
    if (!(await withinRateLimit(RATE_LIMITS.humanCheck))) {
      return { ok: false, configured: true, reason: "too-many-attempts" };
    }
    // No token means the widget could not run in that browser (blocked script,
    // hostname not allowed yet). Let the person through rather than trap them.
    if (!data.token) {
      console.warn("[turnstile] no token supplied for", data.action, "- allowing");
      return { ok: true, configured: true, reason: "unverified" };
    }

    try {
      const body = new URLSearchParams({ secret, response: data.token });
      const response = await fetch(VERIFY_URL, { method: "POST", body });
      const result = (await response.json()) as {
        success?: boolean;
        action?: string;
        "error-codes"?: string[];
      };
      if (!result.success) {
        return {
          ok: false,
          configured: true,
          reason: result["error-codes"]?.join(", ") || "verification-failed",
        };
      }
      return { ok: true, configured: true };
    } catch (error) {
      console.error("[turnstile] verification request failed", error);
      return { ok: false, configured: true, reason: "verification-unavailable" };
    }
  });

/** Server-side gate used inside other server functions. */
export async function assertHuman(token: string | null | undefined, action: string) {
  const secret = process.env["TURNSTILE_SECRET_KEY"];
  if (!secret) return;
  if (!token) {
    console.warn("[turnstile] no token for", action, "- allowing (widget unavailable)");
    return;
  }
  try {
    const body = new URLSearchParams({ secret, response: token });
    const response = await fetch(VERIFY_URL, { method: "POST", body });
    const result = (await response.json()) as { success?: boolean; "error-codes"?: string[] };
    if (!result.success) {
      console.warn("[turnstile] rejected", action, result["error-codes"]);
      throw new Error("The human check didn't pass. Please try again.");
    }
  } catch (error) {
    if (error instanceof Error && error.message.includes("human check")) throw error;
    console.error("[turnstile] verification unreachable, allowing", action, error);
  }
}
