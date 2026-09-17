import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import { planById, planCredits, planPriceCents } from "@/lib/subscriptions";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";
import {
  createStripeClient,
  getStripeErrorMessage,
  resolveStripeEnvForHost,
} from "@/lib/stripe.server";

const inputSchema = z.object({
  planId: z.enum(["observer", "hunter", "operative"]),
  cycle: z.enum(["monthly", "yearly"]),
});

function requestHost(): string | null {
  const url = getRequest()?.url;
  return url ? new URL(url).host : null;
}

function appOrigin(): string {
  const url = getRequest()?.url;
  if (url) return new URL(url).origin;
  return "https://onlookerlive.com";
}

/** Embedded checkout for an Onlooker+ membership. */
export const startSubscriptionCheckout = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) => inputSchema.parse(input))
  .handler(async ({ data, context }): Promise<{ clientSecret?: string; error?: string }> => {
    const plan = planById(data.planId);
    if (!plan) return { error: "That membership is no longer available." };
    if (!(await withinRateLimit(RATE_LIMITS.checkout, context.userId))) {
      return { error: RATE_LIMITED_MESSAGE };
    }

    const env = resolveStripeEnvForHost(requestHost());
    const userId = context.userId;
    const credits = planCredits(plan, data.cycle);
    const amount = planPriceCents(plan, data.cycle);

    try {
      const stripe = createStripeClient(env);
      const metadata = {
        userId,
        kind: "subscription",
        tier: plan.id,
        cycle: data.cycle,
        credits: String(credits),
      };

      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        ui_mode: "embedded_page",
        client_reference_id: userId,
        metadata,
        subscription_data: { metadata },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: amount,
              recurring: { interval: data.cycle === "monthly" ? "month" : "year" },
              product_data: {
                name: `Onlooker+ ${plan.name}`,
                description: `${credits.toLocaleString()} credits per billing period. ${plan.tagline}`,
              },
            },
          },
        ],
        return_url: `${appOrigin()}/profile?credits=success&session_id={CHECKOUT_SESSION_ID}`,
      });

      if (!session.client_secret) {
        return { error: "The payment form could not be opened. Please try again." };
      }
      return { clientSecret: session.client_secret };
    } catch (error) {
      const message = getStripeErrorMessage(error);
      console.error("[subscriptions] checkout failed", { env, userId, plan: plan.id, message });
      return { error: message };
    }
  });
