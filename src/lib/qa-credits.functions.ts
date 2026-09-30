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

/**
 * Clears the caller's cash-out attempt counters (their own and their current
 * address) so a QA run isn't blocked by earlier test attempts.
 */
export const resetCashoutThrottle = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertPreviewOnly();
    const { callerAddress, RATE_LIMITS } = await import("@/lib/rate-limit.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("rate_limits")
      .delete()
      .eq("bucket", RATE_LIMITS.cashout.bucket)
      .in("identifier", [`user:${context.userId}`, `ip:${callerAddress()}`]);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

const QA_POSTER_EMAIL = "qa-poster@onlooker.test";

/**
 * Runs a whole test bounty (posted, claimed, clip submitted, approved) so the
 * caller earns credits through the real approval money path. The earning lands
 * on the 3-day security hold like any genuine payout.
 */
export const simulateBountyPayout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ credits: z.number().int().min(1).max(1000) }).parse(data))
  .handler(async ({ data, context }) => {
    assertPreviewOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const run = async () =>
      supabaseAdmin.rpc("qa_simulate_bounty_payout" as never, {
        _hunter: context.userId,
        _bounty: data.credits,
      } as never);

    let { data: result, error } = await run();
    if (error?.message?.includes("qa_poster_missing")) {
      // The simulator needs a second account to post the bounty; create it once.
      const created = await supabaseAdmin.auth.admin.createUser({
        email: QA_POSTER_EMAIL,
        password: crypto.randomUUID(),
        email_confirm: true,
        user_metadata: { username: "qa_poster", full_name: "QA Test Poster" },
      });
      if (created.error && !/already/i.test(created.error.message)) {
        throw new Error(created.error.message);
      }
      ({ data: result, error } = await run());
    }
    if (error) throw new Error(error.message);

    const row = (result ?? {}) as { net?: number; available_at?: string | null };
    return { net: Number(row.net ?? 0), availableAt: row.available_at ?? null };
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

/**
 * Clears the caller's ID-check state so the one-time verification (and its
 * fee) can be tested again from scratch. Preview hosts only.
 */
export const resetIdentityStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    assertPreviewOnly();
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("qa_reset_identity_status" as never, {
      _uid: context.userId,
    } as never);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
