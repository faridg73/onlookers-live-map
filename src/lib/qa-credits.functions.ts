// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Preview-only QA helpers for exercising the payout system without waiting on
 * real bounty payouts or the 3-day hold. Every call refuses on the production
 * hosts, so these controls cannot be used against real money.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { resolveStripeEnvForHost } from "@/lib/stripe.server";

/** True only outside the live production hosts (preview, local, staging). */
function assertPreviewOnly(): void {
  const host = getRequestHeader("host") ?? null;
  if (resolveStripeEnvForHost(host) !== "sandbox") {
    throw new Error("Test tools are turned off on the live site.");
  }
}

/** Tells the client whether the QA panel may be shown at all. */
export const qaToolsEnabled = createServerFn({ method: "GET" }).handler(async () => {
  const host = getRequestHeader("host") ?? null;
  return { enabled: resolveStripeEnvForHost(host) === "sandbox" };
});

/** Adds test credits to the caller's own balance, available now or on hold. */
export const grantTestCredits = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) =>
    z.object({ credits: z.number().int().min(1).max(100000), onHold: z.boolean() }).parse(data),
  )
  .handler(async ({ data, context }) => {
    assertPreviewOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("qa_grant_test_credits" as never, {
      _uid: context.userId,
      _credits: data.credits,
      _on_hold: data.onHold,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** Ends the 3-day hold on the caller's held credits right away. */
export const releaseCreditHolds = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertPreviewOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("qa_release_credit_holds" as never, {
      _uid: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    const released = Number((data as { released?: number } | null)?.released ?? 0);
    return { released };
  });
