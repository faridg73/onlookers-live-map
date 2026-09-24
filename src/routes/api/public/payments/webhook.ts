// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

import { type StripeEnv, verifyWebhook } from "@/lib/stripe.server";
import { usdToCredits } from "@/lib/credits";
import type { Database } from "@/integrations/supabase/types";

let cached: ReturnType<typeof createClient<Database>> | null = null;
function getSupabase() {
  if (!cached) {
    cached = createClient<Database>(
      process.env["SUPABASE_URL"]!,
      process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
      { auth: { persistSession: false } },
    );
  }
  return cached;
}

/** Adds the paid amount to the buyer's wallet exactly once. */
async function creditTopUp(session: Record<string, any>, env: StripeEnv) {
  const userId = session["metadata"]?.userId ?? session["client_reference_id"];
  const amount = Number(session["amount_total"] ?? 0) / 100;

  if (!userId) {
    console.error("[webhook] top-up without a user id", { session: session["id"] });
    return;
  }
  if (!(amount > 0)) {
    console.error("[webhook] top-up with no amount", { session: session["id"], amount });
    return;
  }

  const { data, error } = await getSupabase().rpc("credit_topup", {
    _user_id: userId,
    _session_id: session["id"],
    // Card top-ups are priced in dollars but credited at the shared fixed rate.
    _amount: usdToCredits(amount),
    _environment: env,
  });

  if (error) {
    console.error("[webhook] credit_topup failed", {
      session: session["id"],
      userId,
      amount,
      message: error.message,
      details: error.details,
    });
    throw new Error(error.message);
  }
  console.log("[webhook] wallet credited", { session: session["id"], userId, amount, fresh: data });
}

/** Adds a bought Credits pack to the buyer's wallet exactly once. */
async function creditCreditPurchase(session: Record<string, any>, env: StripeEnv) {
  const meta = session["metadata"] ?? {};
  const userId = meta.userId ?? session["client_reference_id"];
  const credits = Number(meta.credits ?? 0);
  const packageId = String(meta.packageId ?? "unknown");

  if (!userId || !(credits > 0)) {
    console.error("[webhook] credit purchase missing user or credits", {
      session: session["id"],
      userId,
      credits,
    });
    return;
  }

  const { data, error } = await getSupabase().rpc("credit_purchase", {
    _user_id: userId,
    _session_id: session["id"],
    _package_id: packageId,
    _coins: Math.round(credits),
    _amount_cents: Number(session["amount_total"] ?? 0),
    _environment: env,
  });

  if (error) {
    console.error("[webhook] credit_purchase failed", {
      session: session["id"],
      userId,
      credits,
      message: error.message,
    });
    throw new Error(error.message);
  }
  console.log("[webhook] credits credited", { session: session["id"], userId, credits, fresh: data });
}

/** Activates an Onlooker+ membership and grants its included credits once. */
async function activateSubscription(session: Record<string, any>, env: StripeEnv) {
  const meta = session["metadata"] ?? {};
  const userId = meta.userId ?? session["client_reference_id"];
  const credits = Number(meta.credits ?? 0);
  const tier = String(meta.tier ?? "");
  const cycle = String(meta.cycle ?? "monthly");

  if (!userId || !tier) {
    console.error("[webhook] subscription missing user or tier", {
      session: session["id"],
      userId,
      tier,
    });
    return;
  }

  const supabase = getSupabase();

  if (credits > 0) {
    const { error } = await supabase.rpc("credit_purchase", {
      _user_id: userId,
      _session_id: session["id"],
      _package_id: `plus_${tier}_${cycle}`,
      _coins: Math.round(credits),
      _amount_cents: Number(session["amount_total"] ?? 0),
      _environment: env,
    });
    if (error) {
      console.error("[webhook] subscription credits failed", {
        session: session["id"],
        userId,
        message: error.message,
      });
      throw new Error(error.message);
    }
  }

  // Make sure the wallet row exists before stamping the plan onto it.
  await supabase.rpc("ensure_user_wallet", { _user_id: userId });

  const { error: tierError } = await supabase
    .from("user_wallets")
    .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (tierError) {
    console.error("[webhook] subscription tier update failed", {
      session: session["id"],
      userId,
      message: tierError.message,
    });
    throw new Error(tierError.message);
  }

  console.log("[webhook] membership active", { session: session["id"], userId, tier, credits });
}

/** Grants the monthly credits again when a membership renews. */
async function renewSubscription(invoice: Record<string, any>, env: StripeEnv) {
  const meta =
    invoice["subscription_details"]?.metadata ??
    invoice["lines"]?.data?.[0]?.metadata ??
    {};
  const userId = meta.userId;
  const credits = Number(meta.credits ?? 0);
  const tier = String(meta.tier ?? "");
  const cycle = String(meta.cycle ?? "monthly");

  if (!userId || !tier) {
    console.log("[webhook] invoice without membership metadata", { invoice: invoice["id"] });
    return;
  }
  // The first invoice is already fulfilled by the checkout session.
  if (invoice["billing_reason"] === "subscription_create") return;

  const supabase = getSupabase();

  if (credits > 0) {
    const { error } = await supabase.rpc("credit_purchase", {
      _user_id: userId,
      _session_id: String(invoice["id"]),
      _package_id: `plus_${tier}_${cycle}_renewal`,
      _coins: Math.round(credits),
      _amount_cents: Number(invoice["amount_paid"] ?? 0),
      _environment: env,
    });
    if (error) {
      console.error("[webhook] renewal credits failed", {
        invoice: invoice["id"],
        userId,
        message: error.message,
      });
      throw new Error(error.message);
    }
  }

  await supabase.rpc("ensure_user_wallet", { _user_id: userId });
  await supabase
    .from("user_wallets")
    .update({ subscription_tier: tier, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  console.log("[webhook] membership renewed", { invoice: invoice["id"], userId, tier, credits });
}

/** Drops the member back to the free plan when a membership ends. */
async function endSubscription(subscription: Record<string, any>) {
  const userId = subscription["metadata"]?.userId;
  if (!userId) return;

  const { error } = await getSupabase()
    .from("user_wallets")
    .update({ subscription_tier: "free", updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    console.error("[webhook] membership end failed", {
      subscription: subscription["id"],
      userId,
      message: error.message,
    });
    throw new Error(error.message);
  }
  console.log("[webhook] membership ended", { subscription: subscription["id"], userId });
}

/** Routes a settled checkout: membership, credit pack or money top-up. */
/** Sets or clears a Verified Visits pro plan. */
async function setProPlan(userId: string | undefined, plan: string) {
  if (!userId) return;
  const { error } = await getSupabase()
    .from("pro_accounts")
    .update({ plan, plan_updated_at: new Date().toISOString() })
    .eq("user_id", userId);
  if (error) {
    console.error("[webhook] pro plan update failed", { userId, plan, message: error.message });
    throw new Error(error.message);
  }
  console.log("[webhook] pro plan set", { userId, plan });
}

async function fulfil(session: Record<string, any>, env: StripeEnv) {
  const kind = session["metadata"]?.kind;
  if (kind === "pro_subscription") {
    await setProPlan(session["metadata"]?.userId ?? session["client_reference_id"], String(session["metadata"]?.tier ?? "none"));
    return;
  }
  if (kind === "subscription") await activateSubscription(session, env);
  else if (kind === "credit_purchase") await creditCreditPurchase(session, env);
  else await creditTopUp(session, env);
}

async function handleWebhook(request: Request, env: StripeEnv) {
  const event = await verifyWebhook(request, env);
  console.log("[webhook] event", { type: event.type, env });

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Record<string, any>;
      if (session["payment_status"] !== "unpaid") await fulfil(session, env);
      else console.log("[webhook] payment still settling", { session: session["id"] });
      break;
    }
    case "checkout.session.async_payment_succeeded":
      await fulfil(event.data.object as Record<string, any>, env);
      break;
    case "checkout.session.async_payment_failed":
      console.warn("[webhook] delayed payment failed", {
        session: (event.data.object as Record<string, any>)["id"],
      });
      break;
    case "invoice.paid": {
      const inv = event.data.object as Record<string, any>;
      const m = inv["subscription_details"]?.metadata ?? inv["lines"]?.data?.[0]?.metadata ?? {};
      if (m.kind === "pro_subscription") {
        await setProPlan(m.userId, String(m.tier ?? "none"));
        break;
      }
      await renewSubscription(event.data.object as Record<string, any>, env);
      break;
    }
    case "customer.subscription.deleted": {
      const sub = event.data.object as Record<string, any>;
      if (sub["metadata"]?.kind === "pro_subscription") await setProPlan(sub["metadata"]?.userId, "none");
      else await endSubscription(sub);
      break;
    }
      break;
    default:
      console.log("[webhook] unhandled event", event.type);
  }
}

export const Route = createFileRoute("/api/public/payments/webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const rawEnv = new URL(request.url).searchParams.get("env");
        if (rawEnv !== "sandbox" && rawEnv !== "live") {
          console.error("[webhook] invalid env parameter", rawEnv);
          return Response.json({ received: true, ignored: "invalid env" });
        }
        try {
          await handleWebhook(request, rawEnv);
          return Response.json({ received: true });
        } catch (error) {
          console.error("[webhook] error", error);
          return new Response("Webhook error", { status: 400 });
        }
      },
    },
  },
});
