import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit.server";
import { assertHuman } from "@/lib/turnstile.functions";

/**
 * A broadcaster accepts a funded pin and goes live for it.
 *
 * The human check runs first, then one database action records the claim —
 * which reserves the escrowed reward for this broadcaster — and opens a live
 * session bound to that request, so stream, claim and locked reward are one
 * chain. Nothing is billed per minute: the payout comes out of escrow when the
 * requester approves.
 */
export const acceptBountyAndGoLive = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        requestId: z.string().uuid(),
        captchaToken: z.string().max(4000).nullable().optional(),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ sessionId: string }> => {
    await enforceRateLimit(RATE_LIMITS.acceptBounty, context.userId);
    await assertHuman(data.captchaToken, "accept-bounty");

    const { data: sessionId, error } = await context.supabase.rpc("accept_bounty_and_go_live", {
      _request_id: data.requestId,
    });
    if (error) throw new Error(error.message);
    if (!sessionId) throw new Error("That bounty could not be accepted. Refresh and try again.");

    return { sessionId: sessionId as unknown as string };
  });
