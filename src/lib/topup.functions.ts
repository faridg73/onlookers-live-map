import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
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
 * Card checkout that adds money to the signed-in person's wallet. The wallet is
 * only credited by the Stripe webhook once the payment really settles.
 */
export const startWalletTopUp = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: { amount: number }) =>
    z.object({ amount: z.number().min(5).max(500) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url?: string; error?: string }> => {
    const env = resolveStripeEnvForHost(requestHost());
    const userId = context.userId;
    const cents = Math.round(data.amount * 100);

    console.log("[topup] start", { env, userId, amount: data.amount, host: requestHost() });

    try {
      const stripe = createStripeClient(env);
      const origin = appOrigin();
      const session = await stripe.checkout.sessions.create({
        mode: "payment",
        client_reference_id: userId,
        metadata: { userId, kind: "wallet_topup", amount: String(data.amount) },
        payment_intent_data: {
          metadata: { userId, kind: "wallet_topup", amount: String(data.amount) },
        },
        line_items: [
          {
            quantity: 1,
            price_data: {
              currency: "usd",
              unit_amount: cents,
              product_data: {
                name: "Onlooker wallet top-up",
                description: "Money added to your Onlooker wallet to fund bounties.",
              },
            },
          },
        ],
        success_url: `${origin}/profile?topup=success`,
        cancel_url: `${origin}/profile?topup=cancelled`,
      });

      console.log("[topup] session created", { id: session.id, env, userId });

      if (!session.url) {
        console.error("[topup] session missing url", { id: session.id });
        return { error: "Stripe did not return a payment page. Please try again." };
      }
      return { url: session.url };
    } catch (error) {
      const message = getStripeErrorMessage(error);
      console.error("[topup] checkout failed", { env, userId, amount: data.amount, message, error });
      return { error: message };
    }
  });
