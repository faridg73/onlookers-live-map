import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import { BLOCKED_REQUEST_MESSAGE, findForbiddenTerms } from "@/lib/moderation";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit.server";
import { safeMultiline, safeText } from "@/lib/sanitize";
import { assertHuman } from "@/lib/turnstile.functions";

/** Smallest bounty we accept, so a request is always worth someone's walk. */
export const MIN_BOUNTY = 20;

const createSchema = z.object({
  prompt: safeText(300, 3),
  /** Camera instructions and capture format, stored with the request. */
  details: safeMultiline(2000).nullable().optional(),
  locationName: safeText(160, 2),
  bounty: z.number().finite().min(MIN_BOUNTY).max(50000),
  category: z.string().trim().max(40).nullable().optional(),
  accessCode: z.string().trim().min(4).max(40).nullable().optional(),
  minutes: z.number().int().min(15).max(1440).default(60),
  latitude: z.number().min(-90).max(90).default(0),
  longitude: z.number().min(-180).max(180).default(0),
  /** Cloudflare Turnstile token proving a person posted this request. */
  captchaToken: z.string().max(4000).nullable().optional(),
});

/** Current wallet balance for the signed-in requester. */
export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<number> => {
    const { data } = await context.supabase
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();
    return Number(data?.wallet_balance ?? 0);
  });

/**
 * Creates the request and locks the exact bounty out of the requester's wallet.
 * The database trigger moves the money into escrow in the same transaction, so
 * a request never exists without its deposit held.
 */
export const createBountyRequest = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => createSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string; balance: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Bots never get to lock credits or publish to the map.
    await enforceRateLimit(RATE_LIMITS.createRequest, context.userId);
    await assertHuman(data.captchaToken, "create-bounty");

    // Content filter runs before any money moves: requests to film screens,
    // ticket barcodes or broadcasts never reach the map, and each attempt is
    // logged for a moderator to look at.
    const matched = findForbiddenTerms(data.prompt, data.details, data.locationName);
    if (matched.length > 0) {
      await supabaseAdmin.from("moderation_flags").insert({
        user_id: context.userId,
        title: data.prompt,
        details: data.details ?? "",
        matched_terms: matched,
        source: "request",
      });
      throw new Error(BLOCKED_REQUEST_MESSAGE);
    }

    // The escrow trigger debits the wallet in the same transaction, so check the
    // balance up front and fail with a message people can act on.
    const { data: current } = await supabaseAdmin
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();
    const available = Number(current?.wallet_balance ?? 0);
    if (available < data.bounty) {
      throw new Error(
        `Not enough wallet balance to lock this bounty. You have ${Math.round(available)} Credits available — buy credits first.`,
      );
    }

    const { data: row, error } = await supabaseAdmin
      .from("requests")
      .insert({
        requester_id: context.userId,
        prompt: data.prompt,
        location_name: data.locationName,
        details: data.details ?? "",
        bounty_amount: data.bounty,
        latitude: data.latitude,
        longitude: data.longitude,
        category: data.category ?? null,
        expires_at: new Date(Date.now() + data.minutes * 60_000).toISOString(),
      })
      .select("id")
      .single();

    if (error || !row) {
      const message = error?.message ?? "Could not post the request.";
      throw new Error(
        /insufficient|wallet_balance_nonnegative/i.test(message)
          ? "Not enough wallet balance to lock this bounty. Top up first."
          : message,
      );
    }

    // The passcode lives in its own table so only the requester and the
    // onlooker who claims the bounty can ever read it.
    if (data.accessCode) {
      await supabaseAdmin.from("request_access_codes").insert({
        request_id: row.id,
        requester_id: context.userId,
        code: data.accessCode,
      });
    }

    // Text the nearby onlookers who asked for text alerts. A texting problem
    // must never stop a paid request from going live.
    try {
      const { textNearbyHunters } = await import("@/lib/sms.functions");
      await textNearbyHunters(row.id, context.userId);
    } catch (smsError) {
      console.error("[sms] nearby dispatch failed", smsError);
    }

    // Wake up onlookers standing within 1.5 miles of the pin. An alert problem
    // must never stop a paid request from going live either.
    try {
      const { notifyLocalOnlookersOfBounty } = await import("@/lib/geo-alerts.server");
      await notifyLocalOnlookersOfBounty(row.id, context.userId);
    } catch (alertError) {
      console.error("[geo-alert] nearby dispatch failed", alertError);
    }

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();

    return { id: row.id, balance: Number(profile?.wallet_balance ?? 0) };
  });

/**
 * Returns the private access passcode for a request. RLS only lets the
 * requester and a spotter who has claimed that request read it.
 */
export const getBountyAccessCode = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<string | null> => {
    const { data: row } = await context.supabase
      .from("request_access_codes")
      .select("code")
      .eq("request_id", data.id)
      .maybeSingle();
    return row?.code ?? null;
  });

/**
 * Cancels an unfulfilled request the caller owns. Deleting it triggers the full
 * escrow refund back into their wallet.
 */
export const cancelBountyRequest = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data, context }): Promise<{ balance: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: request } = await supabaseAdmin
      .from("requests")
      .select("id, requester_id, status")
      .eq("id", data.id)
      .maybeSingle();

    if (!request || request.requester_id !== context.userId) {
      throw new Error("That request is not yours to cancel.");
    }
    if (request.status === "completed") {
      throw new Error("This request was already fulfilled and paid out.");
    }

    const { error } = await supabaseAdmin.from("requests").delete().eq("id", data.id);
    if (error) throw new Error(error.message);

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("wallet_balance")
      .eq("id", context.userId)
      .maybeSingle();

    return { balance: Number(profile?.wallet_balance ?? 0) };
  });

/** Refunds deposits for any request that ran out of time unfulfilled. */
export const settleExpiredBounties = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async (): Promise<void> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("settle_escrows");
  });

export type ActiveRequestRow = {
  id: string;
  requesterId: string;
  prompt: string;
  details: string;
  locationName: string;
  bounty: number;
  category: string | null;
  latitude: number;
  longitude: number;
  expiresAt: string;
  createdAt: string;
  mine: boolean;
};

/**
 * Every live request anyone posted, so the map and feed show real bounties
 * instead of one browser's memory. RLS limits this to open, unexpired rows.
 */
export const listActiveRequests = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<ActiveRequestRow[]> => {
    const { data, error } = await context.supabase
      .from("requests")
      .select(
        "id, requester_id, prompt, details, location_name, bounty_amount, category, latitude, longitude, expires_at, created_at, status",
      )
      .eq("status", "open")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) throw new Error(error.message);

    return (data ?? []).map((row) => ({
      id: row.id,
      requesterId: row.requester_id,
      prompt: row.prompt,
      details: row.details ?? "",
      locationName: row.location_name,
      bounty: Number(row.bounty_amount),
      category: row.category ?? null,
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      expiresAt: row.expires_at,
      createdAt: row.created_at,
      mine: row.requester_id === context.userId,
    }));
  });
