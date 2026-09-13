import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import { creditPackageById } from "@/lib/credit-packages";
import {
  createStripeClient,
  getStripeErrorMessage,
  resolveStripeEnvForHost,
} from "@/lib/stripe.server";

function requestHost(): string | null {
  const url = getRequest()?.url;
  return url ? new URL(url).host : null;
}

function appOrigin(): string {
  const url = getRequest()?.url;
  if (url) return new URL(url).origin;
  return "https://onlookerlive.com";
}

/**
 * Card checkout for a Looker Credits pack. Credits are only added to the wallet by
 * the payment webhook, once the charge really settles.
 */
export const startCreditPurchase = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: { packageId: string }) =>
    z.object({ packageId: z.string().min(3).max(60) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url?: string; error?: string }> => {
    const pack = creditPackageById(data.packageId);
    if (!pack) return { error: "That credit pack is no longer available." };

    const env = resolveStripeEnvForHost(requestHost());
    const userId = context.userId;

    try {
      const stripe = createStripeClient(env);
      const origin = appOrigin();

      const prices = await stripe.prices.list({ lookup_keys: [pack.priceId], limit: 1 });
      const price = prices.data[0];

      const metadata = {
        userId,
        kind: "credit_purchase",
        packageId: pack.id,
        credits: String(pack.credits),
      };

      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: userId,
        metadata,
        payment_intent_data: {
          description: `${pack.name} — ${pack.credits} Looker Credits`,
          metadata,
        },
        line_items: [
          price
            ? { quantity: 1, price: price.id }
            : {
                quantity: 1,
                price_data: {
                  currency: "usd",
                  unit_amount: pack.priceCents,
                  product_data: {
                    name: `${pack.name} — ${pack.credits} Looker Credits`,
                    description: pack.blurb,
                  },
                },
              },
        ],
        success_url: `${origin}/profile?credits=success`,
        cancel_url: `${origin}/profile?credits=cancelled`,
      });

      if (!session.url) {
        return { error: "Stripe did not return a payment page. Please try again." };
      }
      return { url: session.url };
    } catch (error) {
      const message = getStripeErrorMessage(error);
      console.error("[credits] checkout failed", { env, userId, pack: pack.id, message });
      return { error: message };
    }
  });
