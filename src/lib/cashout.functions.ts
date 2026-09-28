// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
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

    {
      const { recordAccountSignal } = await import("@/lib/account-signals.server");
      await recordAccountSignal(context.userId);
    }

    const { data: id, error } = await context.supabase.rpc("request_credit_cashout", {
      _coins: data.credits,
    });
    if (error) {
      console.error("[cashout] credits failed", { userId: context.userId, message: error.message });
      return { error: /insufficient credits/i.test(error.message) ? "Insufficient Credits" : error.message };
    }
    const payoutId = String(id);

    // Send the money to the member's connected Stripe account right away.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { createStripeClient, getStripeErrorMessage } = await import("@/lib/stripe.server");
    const refund = async (reason: string) => {
      await supabaseAdmin.rpc("refund_failed_credit_cashout" as never, { _payout_id: payoutId, _reason: reason } as never);
      return { error: reason };
    };
    const [{ data: account }, { data: payout }] = await Promise.all([
      supabaseAdmin
        .from("payout_accounts")
        .select("stripe_account_id, payouts_enabled, environment")
        .eq("user_id", context.userId)
        .maybeSingle(),
      supabaseAdmin.from("payout_requests").select("cash_amount_usd").eq("id", payoutId).maybeSingle(),
    ]);
    if (!account?.payouts_enabled || !account.stripe_account_id) {
      return refund("Connect a bank account before cashing out. Your Credits were returned.");
    }
    const cents = Math.round(Number(payout?.cash_amount_usd ?? 0) * 100);
    if (cents <= 0) return refund("Cash-out amount is too small after fees. Your Credits were returned.");
    try {
      const stripe = createStripeClient(account.environment === "sandbox" ? "sandbox" : "live");
      const transfer = await stripe.transfers.create(
        {
          amount: cents,
          currency: "usd",
          destination: account.stripe_account_id,
          metadata: { payout_request_id: payoutId, user_id: context.userId },
        },
        { idempotencyKey: `credit_cashout_${payoutId}` },
      );
      await supabaseAdmin
        .from("payout_requests")
        .update({ status: "paid", stripe_transfer_id: transfer.id })
        .eq("id", payoutId);
      return { id: payoutId };
    } catch (error) {
      const raw = getStripeErrorMessage(error);
      console.error("[cashout] transfer failed", { userId: context.userId, payoutId, raw });
      return refund(
        raw.includes("balance_insufficient") || /insufficient/i.test(raw)
          ? "The payments account doesn't have enough balance to send this yet. Your Credits were returned."
          : `Transfer failed: ${raw}. Your Credits were returned.`,
      );
    }
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
