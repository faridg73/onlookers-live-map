// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";
import { BLOCKED_REQUEST_MESSAGE, findForbiddenTerms } from "@/lib/moderation";
import { enforceRateLimit, RATE_LIMITS } from "@/lib/rate-limit.server";
import { safeMultiline, safeText } from "@/lib/sanitize";
import { assertHuman } from "@/lib/turnstile.functions";

/** Smallest bounty we accept, so a request is always worth someone's walk. */
export const MIN_BOUNTY = 40;

/**
 * Unique 6-digit on-site PIN for a real estate bounty, drawn from the crypto
 * random source so it cannot be guessed from the posting time.
 */
function generateSitePin(): string {
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + ((bytes[0] ?? 0) % 900000));
}


const createSchema = z.object({
  prompt: safeText(300, 3),
  /** Camera instructions and capture format, stored with the request. */
  details: safeMultiline(2000).nullable().optional(),
  locationName: safeText(160, 2),
  bounty: z.number().finite().min(MIN_BOUNTY).max(50000),
  category: z.string().trim().max(40).nullable().optional(),
  authorizationConfirmed: z.boolean().optional().default(false),
  accessCode: z.string().trim().min(4).max(40).nullable().optional(),
  /** Real-estate agent contact used to deliver the 6-digit on-site PIN. */
  agentContact: z
    .object({
      name: z.string().trim().max(120).optional().default(""),
      phone: z.string().trim().max(32).optional().default(""),
      email: z.string().trim().max(255).optional().default(""),
    })
    .nullable()
    .optional(),
  minutes: z.number().int().min(15).max(1440).default(60),
  latitude: z.number().min(-90).max(90).default(0),
  longitude: z.number().min(-180).max(180).default(0),
  /** Exact calendar deadline picked in the form; overrides `minutes` when set. */
  customDeadlineAt: z.string().datetime({ offset: true }).nullable().optional(),
  /** Requested live stream / recording length in minutes. */
  durationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  /** 'live_stream' or 'pre_recorded_clip'. */
  bountyType: z.enum(["live_stream", "pre_recorded_clip"]).nullable().optional(),
  /** When a pre-recorded clip's recording should start. */
  scheduledStartAt: z.string().datetime({ offset: true }).nullable().optional(),
  /** Requester-typed capture length, when they didn't use a preset pill. */
  customDurationMinutes: z.number().int().min(1).max(1440).nullable().optional(),
  /** Difficulty premium for filming conditions, 1.0 = clear. */
  weatherMultiplier: z.number().min(1).max(3).nullable().optional(),
  /** 'standard', 'fast_catch' or 'priority_hunt'. */
  bountyTier: z.enum(["standard", "fast_catch", "priority_hunt"]).nullable().optional(),
  /** Cloudflare Turnstile token proving a person posted this request. */
  captchaToken: z.string().max(4000).nullable().optional(),
});

/** Current wallet balance for the signed-in requester. */
export const getWalletBalance = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<number> => {
    // The credit wallet is the same balance shown on /balance — never the
    // legacy profile column, which can drift behind it.
    const { data } = await context.supabase
      .from("user_credit_wallets")
      .select("credit_balance")
      .eq("user_id", context.userId)
      .maybeSingle();
    return Number(data?.credit_balance ?? 0);
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

    if (data.category === "realestate" && !data.authorizationConfirmed) {
      throw new Error(
        "Confirm explicit authorization from the seller, listing agent, or property manager before posting a real estate bounty.",
      );
    }

    // The escrow trigger debits the wallet in the same transaction, so check the
    // balance up front and fail with a message people can act on.
    const { data: current } = await supabaseAdmin
      .from("user_credit_wallets")
      .select("credit_balance")
      .eq("user_id", context.userId)
      .maybeSingle();
    const available = Number(current?.credit_balance ?? 0);
    if (available < data.bounty) {
      throw new Error(
        `Not enough wallet balance to lock this bounty. You have ${Math.round(available)} Credits available, buy credits first.`,
      );
    }

    // A custom calendar deadline wins over the quick-select countdown.
    let expiresAt = new Date(Date.now() + data.minutes * 60_000);
    if (data.customDeadlineAt) {
      const custom = new Date(data.customDeadlineAt);
      if (Number.isNaN(custom.getTime()) || custom.getTime() <= Date.now()) {
        throw new Error("Pick a deadline in the future.");
      }
      expiresAt = custom;
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
        expires_at: expiresAt.toISOString(),
        custom_deadline_at: data.customDeadlineAt ?? null,
        duration_minutes: data.durationMinutes ?? 5,
        bounty_type: data.bountyType ?? "live_stream",
        scheduled_start_at: data.scheduledStartAt ?? null,
        custom_duration_minutes: data.customDurationMinutes ?? null,
        weather_multiplier: data.weatherMultiplier ?? 1,
        bounty_tier: data.bountyTier ?? "standard",
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

    // Real estate bounties get a unique 6-digit on-site PIN. Only the poster
    // ever sees it; the onlooker has to get it from the agent standing at the
    // property, which is what unlocks footage submission and the payout.
    if (data.category === "realestate") {
      const pin = generateSitePin();
      await supabaseAdmin.from("request_site_pins").insert({
        request_id: row.id,
        requester_id: context.userId,
        pin,
      });

      // Deliver the PIN straight to the listing agent the poster named, so the
      // PIN never has to be copied by hand. A delivery problem must never stop
      // a paid request from going live.
      const contact = data.agentContact;
      const phone = contact?.phone ?? "";
      const email = contact?.email ?? "";
      if (phone.length >= 5 || email.includes("@")) {
        try {
          const { sendAgentPin } = await import("@/lib/agent-pin.server");
          const delivery = await sendAgentPin(
            { name: contact?.name ?? "", phone, email },
            { pin, requestId: row.id, locationName: data.locationName },
          );
          if (phone && !delivery.sms && delivery.smsError) {
            console.error(`[agent-pin] SMS to agent failed: ${delivery.smsError}`);
          }
          if (email && !delivery.email && delivery.emailError) {
            console.error(`[agent-pin] email to agent failed: ${delivery.emailError}`);
          }
        } catch (pinError) {
          console.error("[agent-pin] agent delivery failed", pinError);
        }
      }
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

    const { data: wallet } = await supabaseAdmin
      .from("user_credit_wallets")
      .select("credit_balance")
      .eq("user_id", context.userId)
      .maybeSingle();

    return { id: row.id, balance: Number(wallet?.credit_balance ?? 0) };
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

    const { data: wallet } = await supabaseAdmin
      .from("user_credit_wallets")
      .select("credit_balance")
      .eq("user_id", context.userId)
      .maybeSingle();

    return { balance: Number(wallet?.credit_balance ?? 0) };
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
  /** Reward tier the requester picked: standard, fast_catch or priority_hunt. */
  bountyTier: string | null;
  /** 'live_stream' or 'pre_recorded_clip'. */
  bountyType: string;
  /** Capture length in minutes the onlooker is being asked to film. */
  captureMinutes: number;
  /** When a pre-recorded clip should start filming, when scheduled. */
  scheduledStartAt: string | null;
  /** Filming-conditions premium already priced into the bounty. */
  weatherMultiplier: number;
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
        "id, requester_id, prompt, details, location_name, bounty_amount, category, latitude, longitude, expires_at, created_at, status, bounty_tier, bounty_type, duration_minutes, custom_duration_minutes, scheduled_start_at, weather_multiplier",
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
      bountyTier: row.bounty_tier ?? "standard",
      bountyType: row.bounty_type ?? "live_stream",
      captureMinutes: Number(row.custom_duration_minutes ?? row.duration_minutes ?? 5),
      scheduledStartAt: row.scheduled_start_at ?? null,
      weatherMultiplier: Number(row.weather_multiplier ?? 1),
    }));
  });
