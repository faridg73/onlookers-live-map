import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import {
  creditPackageById,
  CUSTOM_CREDIT_MAX,
  CUSTOM_CREDIT_MIN,
  customCreditPriceCents,
  CENTS_PER_CREDIT,
  type CreditPackage,
} from "@/lib/credit-packages";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";
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

/** Finds or creates the buyer's payment customer, tagged with their user id. */
async function resolveCustomer(
  stripe: ReturnType<typeof createStripeClient>,
  options: { userId: string; email?: string | undefined },
): Promise<string | undefined> {
  if (!/^[a-zA-Z0-9_-]+$/.test(options.userId)) return undefined;

  const found = await stripe.customers.search({
    query: `metadata['userId']:'${options.userId}'`,
    limit: 1,
  });
  if (found.data.length) return found.data[0]!.id;

  if (options.email) {
    const existing = await stripe.customers.list({ email: options.email, limit: 1 });
    const customer = existing.data[0];
    if (customer) {
      if (customer.metadata?.["userId"] !== options.userId) {
        await stripe.customers.update(customer.id, {
          metadata: { ...customer.metadata, userId: options.userId },
        });
      }
      return customer.id;
    }
  }

  const created = await stripe.customers.create({
    ...(options.email ? { email: options.email } : {}),
    metadata: { userId: options.userId },
  });
  return created.id;
}

/**
 * Embedded checkout for a Credits pack. Apple Pay, Google Pay, Link and cards
 * are all offered by the hosted payment form. Credits are only added to the
 * wallet by the payment webhook, once the charge really settles.
 */
export const startCreditPurchase = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: { packageId: string }) =>
    z.object({ packageId: z.string().min(3).max(60) }).parse(input),
  )
  .handler(
    async ({ data, context }): Promise<{ clientSecret?: string; error?: string }> => {
      const pack = creditPackageById(data.packageId);
      if (!pack) return { error: "That credit pack is no longer available." };
      if (!(await withinRateLimit(RATE_LIMITS.checkout, context.userId))) {
        return { error: RATE_LIMITED_MESSAGE };
      }

      const env = resolveStripeEnvForHost(requestHost());
      const userId = context.userId;

      try {
        const stripe = createStripeClient(env);
        const origin = appOrigin();

        const prices = await stripe.prices.list({ lookup_keys: [pack.priceId], limit: 1 });
        const price = prices.data[0];

        const email = (context.claims as { email?: string } | undefined)?.email;
        const customerId = await resolveCustomer(stripe, { userId, email });

        const metadata = {
          userId,
          kind: "credit_purchase",
          packageId: pack.id,
          credits: String(pack.credits),
        };

        const session = await stripe.checkout.sessions.create({
          mode: "payment",
          ui_mode: "embedded_page",
          client_reference_id: userId,
          metadata,
          ...(customerId ? { customer: customerId } : {}),
          payment_intent_data: {
            description: `${pack.name} — ${pack.credits} Credits`,
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
                      name: `${pack.name} — ${pack.credits} Credits`,
                      description: pack.blurb,
                    },
                  },
                },
          ],
          return_url: `${origin}/profile?credits=success&session_id={CHECKOUT_SESSION_ID}`,
        });

        if (!session.client_secret) {
          return { error: "The payment form could not be opened. Please try again." };
        }
        return { clientSecret: session.client_secret };
      } catch (error) {
        const message = getStripeErrorMessage(error);
        console.error("[credits] checkout failed", { env, userId, pack: pack.id, message });
        return { error: message };
      }
    },
  );
