import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import {
  createStripeClient,
  getStripeErrorMessage,
  resolveStripeEnvForHost,
  stripeV2Request,
  type StripeEnv,
} from "@/lib/stripe.server";

export type PayoutStatus = {
  connected: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted: boolean;
  requirementsNote: string;
  /** False when the platform payments account lacks Connect, so bank payouts can't run. */
  supported?: boolean;
};

const CONNECT_UNSUPPORTED = "Direct bank cash-outs aren't available on this payments account yet. Use “Request payout” in your Earnings Wallet instead.";

function isConnectUnsupported(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("Connect enabled");
}

type V2Account = {
  id: string;
  configuration?: {
    recipient?: {
      capabilities?: {
        stripe_balance?: {
          stripe_transfers?: { status?: string };
          payouts?: { status?: string };
        };
      };
    };
  };
  requirements?: { entries?: { description?: string; awaiting_action_from?: string }[] };
};

function requestHost(): string | null {
  const url = getRequest()?.url;
  return url ? new URL(url).host : null;
}

function appOrigin(): string {
  const url = getRequest()?.url;
  if (url) return new URL(url).origin;
  return "https://onlookerlive.com";
}

function currentEnv(): StripeEnv {
  return resolveStripeEnvForHost(requestHost());
}

function readAccount(account: V2Account) {
  const capabilities = account.configuration?.recipient?.capabilities?.stripe_balance;
  const payoutsEnabled =
    capabilities?.stripe_transfers?.status === "active" && capabilities?.payouts?.status === "active";
  const pending = (account.requirements?.entries ?? [])
    .filter((entry) => entry.awaiting_action_from === "user")
    .map((entry) => entry.description ?? "")
    .filter(Boolean);
  return {
    payoutsEnabled,
    detailsSubmitted: pending.length === 0,
    requirementsNote: pending.slice(0, 4).join(", "),
  };
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
      const account = await stripeV2Request<V2Account>(
        currentEnv(),
        "GET",
        `/v2/core/accounts/${row.stripe_account_id}?include=configuration.recipient&include=requirements`,
      );
      const next = readAccount(account);

      await supabaseAdmin
        .from("payout_accounts")
        .update({
          payouts_enabled: next.payoutsEnabled,
          details_submitted: next.detailsSubmitted,
          requirements_note: next.requirementsNote,
        })
        .eq("user_id", context.userId);

      return { connected: true, ...next };
    } catch (error) {
      const unsupported = isConnectUnsupported(error);
      return {
        connected: true,
        payoutsEnabled: row.payouts_enabled,
        detailsSubmitted: row.details_submitted,
        requirementsNote: row.requirements_note,
        supported: unsupported ? false : true,
        error: unsupported
          ? CONNECT_UNSUPPORTED
          : error instanceof Error
            ? error.message
            : getStripeErrorMessage(error),
      };
    }
  });

/** Create (or reuse) the reporter's payout account and return an onboarding link. */
export const startPayoutOnboarding = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ url?: string; error?: string }> => {
    const env = currentEnv();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    try {
      const { data: row } = await supabaseAdmin
        .from("payout_accounts")
        .select("stripe_account_id")
        .eq("user_id", context.userId)
        .maybeSingle();

      let accountId = row?.stripe_account_id;
      if (!accountId) {
        const email =
          (context.claims as { email?: string } | undefined)?.email ??
          `hunter+${context.userId}@onlookerlive.com`;

        const account = await stripeV2Request<V2Account>(env, "POST", "/v2/core/accounts", {
          dashboard: "express",
          contact_email: email,
          identity: { country: "us", entity_type: "individual" },
          defaults: {
            currency: "usd",
            responsibilities: { losses_collector: "application", fees_collector: "application" },
          },
          include: ["configuration.recipient", "requirements"],
          configuration: {
            recipient: {
              capabilities: { stripe_balance: { stripe_transfers: { requested: true } } },
            },
          },
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
      const link = await stripeV2Request<{ url: string }>(env, "POST", "/v2/core/account_links", {
        account: accountId,
        use_case: {
          type: "account_onboarding",
          account_onboarding: {
            configurations: ["recipient"],
            refresh_url: `${origin}/profile?payout=refresh`,
            return_url: `${origin}/profile?payout=done`,
          },
        },
      });

      return { url: link.url };
    } catch (error) {
      if (isConnectUnsupported(error)) return { error: CONNECT_UNSUPPORTED };
      return { error: error instanceof Error ? error.message : getStripeErrorMessage(error) };
    }
  });

/** Redeem Looker Credits from the wallet as cash into the reporter's bank account (4 Credits = $1.00). */
export const cashOut = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data) => z.object({ amount: z.number().positive() }).parse(data))
  .handler(async ({ data, context }): Promise<{ amount?: number; error?: string }> => {
    const env = currentEnv();
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
          // data.amount is in Looker Credits; 4 credits = $1.00 = 100 cents.
          amount: Math.round(data.amount * 25),
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
      const raw = getStripeErrorMessage(error);
      const message = raw.includes("balance_insufficient")
        ? "The payments account does not have enough balance to send this cash out yet. Your money stayed in your wallet."
        : raw;
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
