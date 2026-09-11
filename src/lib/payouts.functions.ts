import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import {
  createStripeClient,
  getStripeErrorMessage,
  resolveStripeEnv,
} from "@/lib/stripe.server";

export type PayoutStatus = {
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsNote: string;
};

function appOrigin(): string {
  const url = getRequest()?.url;
  return url ? new URL(url).origin : "";
}

/** Read (and refresh from Stripe) the reporter's bank payout status. */
export const getPayoutStatus = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<PayoutStatus & { error?: string }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("payout_accounts")
      .select("*")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!row) {
      return { connected: false, payoutsEnabled: false, detailsSubmitted: false, requirementsNote: "" };
    }

    try {
      const stripe = createStripeClient(resolveStripeEnv());
      const account = await stripe.accounts.retrieve(row.stripe_account_id);
      const requirementsNote = (account.requirements?.currently_due ?? []).join(", ");
      const payoutsEnabled = Boolean(account.payouts_enabled);
      const detailsSubmitted = Boolean(account.details_submitted);

      await supabaseAdmin
        .from("payout_accounts")
        .update({ payouts_enabled: payoutsEnabled, details_submitted: detailsSubmitted, requirements_note: requirementsNote })
        .eq("user_id", context.userId);

      return { connected: true, payoutsEnabled, detailsSubmitted, requirementsNote };
    } catch (error) {
      return {
        connected: true,
        payoutsEnabled: row.payouts_enabled,
        detailsSubmitted: row.details_submitted,
        requirementsNote: row.requirements_note,
        error: getStripeErrorMessage(error),
      };
    }
  });

/** Create (or reuse) the reporter's payout account and return an onboarding link. */
export const startPayoutOnboarding = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url?: string; error?: string }> => {
    const env = resolveStripeEnv();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const stripe = createStripeClient(env);
      const { data: row } = await supabaseAdmin
        .from("payout_accounts")
        .select("stripe_account_id")
        .eq("user_id", context.userId)
        .maybeSingle();

      let accountId = row?.stripe_account_id;
      if (!accountId) {
        const account = await stripe.accounts.create({
          type: "express",
          capabilities: { transfers: { requested: true } },
          business_type: "individual",
          metadata: { user_id: context.userId },
        });
        accountId = account.id;
        await supabaseAdmin.from("payout_accounts").upsert({
          user_id: context.userId,
          stripe_account_id: accountId,
          environment: env,
        });
      }

      const origin = appOrigin();
      const link = await stripe.accountLinks.create({
        account: accountId,
        type: "account_onboarding",
        refresh_url: `${origin}/profile?payout=refresh`,
        return_url: `${origin}/profile?payout=done`,
      });

      return { url: link.url };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Move wallet money to the reporter's bank account. */
export const cashOut = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data) => z.object({ amount: z.number().positive() }).parse(data))
  .handler(async ({ data, context }): Promise<{ amount?: number; error?: string }> => {
    const env = resolveStripeEnv();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: account } = await supabaseAdmin
      .from("payout_accounts")
      .select("stripe_account_id, payouts_enabled")
      .eq("user_id", context.userId)
      .maybeSingle();

    if (!account?.payouts_enabled) {
      return { error: "Connect a bank account before cashing out." };
    }

    // Debits the wallet and records a pending cash out (as the signed-in user).
    const { data: cashoutId, error: rpcError } = await context.supabase.rpc("request_cashout", {
      _amount: data.amount,
    });
    if (rpcError || !cashoutId) {
      return { error: rpcError?.message ?? "Could not start the cash out." };
    }

    try {
      const stripe = createStripeClient(env);
      const transfer = await stripe.transfers.create(
        {
          amount: Math.round(data.amount * 100),
          currency: "usd",
          destination: account.stripe_account_id,
          metadata: { cashout_id: cashoutId, user_id: context.userId },
        },
        { idempotencyKey: `cashout_${cashoutId}` },
      );

      await supabaseAdmin
        .from("cashouts")
        .update({ status: "paid", stripe_transfer_id: transfer.id })
        .eq("id", cashoutId);

      return { amount: data.amount };
    } catch (error) {
      const message = getStripeErrorMessage(error);
      // Refund the wallet so the reporter never loses money on a failed transfer.
      await supabaseAdmin.rpc("adjust_wallet", {
        _user_id: context.userId,
        _amount: data.amount,
        _kind: "cashout_refund",
        _request_id: null as unknown as string,
        _note: "Cash out failed, money returned",
      });
      await supabaseAdmin
        .from("cashouts")
        .update({ status: "failed", error_message: message })
        .eq("id", cashoutId);
      return { error: message };
    }
  });
