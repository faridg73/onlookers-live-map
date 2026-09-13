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

/** Adds a bought Looker Credits pack to the buyer's wallet exactly once. */
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

  const { data, error } = await getSupabase().rpc("credit_credit_purchase", {
    _user_id: userId,
    _session_id: session["id"],
    _package_id: packageId,
    _credits: Math.round(credits),
    _amount_cents: Number(session["amount_total"] ?? 0),
    _environment: env,
  });

  if (error) {
    console.error("[webhook] credit_credit_purchase failed", {
      session: session["id"],
      userId,
      credits,
      message: error.message,
    });
    throw new Error(error.message);
  }
  console.log("[webhook] credits credited", { session: session["id"], userId, credits, fresh: data });
}

/** Routes a settled checkout to the right wallet: money top-up or credit pack. */
async function fulfil(session: Record<string, any>, env: StripeEnv) {
  if (session["metadata"]?.kind === "credit_purchase") await creditCreditPurchase(session, env);
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
