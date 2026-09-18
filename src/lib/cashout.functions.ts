import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import {
  callerAddress,
  RATE_LIMITED_MESSAGE,
  RATE_LIMITS,
  withinRateLimit,
} from "@/lib/rate-limit.server";

/**
 * Cash-outs only ever run through these server functions: the amount is
 * validated here, the request is throttled per member and per address, and the
 * balance check plus the deduction happen together inside the database.
 */

async function throttle(userId: string): Promise<string | null> {
  const perUser = await withinRateLimit(RATE_LIMITS.cashout, `user:${userId}`);
  const perAddress = await withinRateLimit(RATE_LIMITS.cashout, `ip:${callerAddress()}`);
  return perUser && perAddress ? null : RATE_LIMITED_MESSAGE;
}

/** Redeems credits for cash. */
export const submitCreditCashout = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: { credits: number }) =>
    z.object({ credits: z.coerce.number().int().min(40).max(100000) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id?: string; error?: string }> => {
    const limited = await throttle(context.userId);
    if (limited) return { error: limited };

    const { data: id, error } = await context.supabase.rpc("request_credit_cashout", {
      _coins: data.credits,
    });
    if (error) {
      console.error("[cashout] credits failed", { userId: context.userId, message: error.message });
      return { error: /insufficient credits/i.test(error.message) ? "Insufficient Credits" : error.message };
    }
    return { id: String(id) };
  });

/** Files an earnings payout request for review. */
export const submitEarningsPayout = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: { amount: number; destination?: string }) =>
    z
      .object({
        amount: z.coerce.number().positive().max(25000),
        destination: z.string().trim().max(40).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }): Promise<{ id?: string; error?: string }> => {
    const limited = await throttle(context.userId);
    if (limited) return { error: limited };

    const { data: id, error } = await context.supabase.rpc("request_earnings_payout", {
      _amount: data.amount,
      _destination: data.destination && data.destination.length > 0 ? data.destination : "bank",
    });
    if (error) {
      console.error("[cashout] payout failed", { userId: context.userId, message: error.message });
      return { error: error.message };
    }
    return { id: String(id) };
  });
