// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

export type IdentityStatus = {
  verified: boolean;
  feeCharged: boolean;
  country: string | null;
  pending: boolean;
  frozen: boolean;
  error?: string;
};

function origin(): string {
  const req = getRequest();
  for (const c of [req?.headers.get("origin"), req?.headers.get("referer"), req?.url]) {
    if (!c) continue;
    try {
      const u = new URL(c);
      if (u.protocol === "https:" || u.hostname === "localhost") return u.origin;
    } catch {
      /* ignore */
    }
  }
  return "https://www.onlooker.io";
}

/** Reusable Stripe Identity flows for non-US members (document + matching selfie), per Stripe mode. */
const INTERNATIONAL_ID_FLOW: Record<"live" | "sandbox", string> = {
  live: "vf_1UKkltRYtIZ43KIo1ProHTI1",
  sandbox: "vf_1UKl18RYtIZ43KIo3O2rOl9E",
};

/** Starts the one-time ID check. US members get a document check; others add a selfie match. */
export const startIdentityCheck = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: { country: string }) =>
    z.object({ country: z.string().trim().length(2) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ url?: string; error?: string }> => {
    const { createStripeClient, getStripeErrorMessage, resolveStripeEnvForHost } = await import("@/lib/stripe.server");
    try {
      const host = getRequest()?.url ? new URL(getRequest()!.url).host : null;
      const stripe = createStripeClient(resolveStripeEnvForHost(host));
      const country = data.country.toUpperCase();
      const { data: me } = await context.supabase
        .from("profiles")
        .select("account_frozen_at")
        .eq("id", context.userId)
        .maybeSingle();
      // A frozen account's check is an unfreeze re-check.
      const kind = me?.account_frozen_at ? "account_unfreeze" : "payout_identity";
      const common = {
        metadata: { userId: context.userId, country, kind },
        client_reference_id: context.userId,
        return_url: `${origin()}/balance?id_check=done`,
      };
      // US: ID-number lookup only (no document, no selfie).
      // International: the reusable document + live selfie flow set up in Stripe.
      const session = await stripe.identity.verificationSessions.create(
        country === "US"
          ? { type: "id_number", ...common }
          : { verification_flow: INTERNATIONAL_ID_FLOW, ...common },
      );
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("payout_security_logs").insert({
        user_id: context.userId,
        event_type: "identity_started",
        details: { session: session.id, country },
      });
      if (!session.url) return { error: "Could not open the ID check" };
      return { url: session.url };
    } catch (error) {
      console.error("[identity] start failed", error);
      return { error: getStripeErrorMessage(error) };
    }
  });

/** Current ID-check state; also confirms a just-finished check with Stripe. */
export const getIdentityStatus = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<IdentityStatus> => {
    const { data: profile } = await context.supabase
      .from("profiles")
      .select("payout_identity_verified_at, payout_identity_fee_charged_at, payout_country, account_frozen_at")
      .eq("id", context.userId)
      .maybeSingle();
    const base: IdentityStatus = {
      verified: Boolean(profile?.payout_identity_verified_at),
      feeCharged: Boolean(profile?.payout_identity_fee_charged_at),
      country: profile?.payout_country ?? null,
      pending: false,
      frozen: Boolean(profile?.account_frozen_at),
    };
    if (base.verified && !base.frozen) return base;

    const { data: started } = await context.supabase
      .from("payout_security_logs")
      .select("details")
      .eq("user_id", context.userId)
      .eq("event_type", "identity_started")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const details = started?.details as { session?: string; country?: string } | null;
    if (!details?.session) return base;

    const { createStripeClient, resolveStripeEnvForHost, getStripeErrorMessage } = await import("@/lib/stripe.server");
    try {
      const host = getRequest()?.url ? new URL(getRequest()!.url).host : null;
      const stripe = createStripeClient(resolveStripeEnvForHost(host));
      const session = await stripe.identity.verificationSessions.retrieve(details.session);
      if (session.metadata?.["userId"] !== context.userId) return base;
      if (session.status === "verified") {
        const { markIdentityVerified } = await import("@/lib/identity.server");
        await markIdentityVerified(session as never, details.country);
        const unfroze = session.metadata?.["kind"] === "account_unfreeze";
        return { ...base, verified: true, frozen: unfroze ? false : base.frozen, country: base.country ?? details.country ?? null };
      }
      return { ...base, pending: session.status === "processing" };
    } catch (error) {
      return { ...base, error: getStripeErrorMessage(error) };
    }
  });
