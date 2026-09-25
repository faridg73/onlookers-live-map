// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import { proPlanById } from "@/lib/pro-plans";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";
import {
  createStripeClient,
  getStripeErrorMessage,
  resolveStripeEnvForHost,
} from "@/lib/stripe.server";

function appOrigin(): string {
  const req = getRequest();
  for (const c of [req?.headers.get("origin"), req?.headers.get("referer"), req?.url]) {
    if (!c) continue;
    try {
      const u = new URL(c);
      if (u.hostname === "localhost" || u.hostname === "127.0.0.1" || u.protocol !== "https:") continue;
      return u.origin;
    } catch {
      /* ignore */
    }
  }
  return "https://onlooker.io";
}

/** Embedded checkout for a Verified Visits Pro plan. Requires a pro account. */
export const startProCheckout = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) => z.object({ planId: z.enum(["starter", "pro", "team"]) }).parse(input))
  .handler(async ({ data, context }): Promise<{ clientSecret?: string; error?: string }> => {
    const plan = proPlanById(data.planId);
    if (!plan) return { error: "That plan is no longer available." };
    if (!(await withinRateLimit(RATE_LIMITS.checkout, context.userId))) {
      return { error: RATE_LIMITED_MESSAGE };
    }
    const { data: account } = await context.supabase
      .from("pro_accounts")
      .select("plan")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (!account) return { error: "Create your professional account first." };
    if (account.plan === plan.id) return { error: `You're already on the ${plan.name} plan.` };

    const env = resolveStripeEnvForHost(new URL(getRequest()?.url ?? "https://x").host);
    try {
      const stripe = createStripeClient(env);
      const metadata = { userId: context.userId, kind: "pro_subscription", tier: plan.id };
      const session = await stripe.checkout.sessions.create({
        mode: "subscription",
        ui_mode: "embedded_page",
        client_reference_id: context.userId,
        metadata,
        subscription_data: { metadata },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: plan.priceCents,
              recurring: { interval: "month" },
              product_data: {
                name: `Verified Visits ${plan.name}`,
                description: `${plan.visits}. ${plan.tagline}`,
              },
            },
          },
        ],
        return_url: `${appOrigin()}/verification?pro=success`,
      });
      if (!session.client_secret) return { error: "The payment form could not be opened." };
      return { clientSecret: session.client_secret };
    } catch (error) {
      return { error: getStripeErrorMessage(error) };
    }
  });
