import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

/** Smallest bounty we accept, so a request is always worth someone's walk. */
export const MIN_BOUNTY = 5;

const createSchema = z.object({
  prompt: z.string().trim().min(3).max(300),
  locationName: z.string().trim().min(2).max(160),
  bounty: z.number().finite().min(MIN_BOUNTY).max(5000),
  category: z.string().trim().max(40).nullable().optional(),
  accessCode: z.string().trim().min(4).max(40).nullable().optional(),
  minutes: z.number().int().min(15).max(1440).default(60),
  latitude: z.number().min(-90).max(90).default(0),
  longitude: z.number().min(-180).max(180).default(0),
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
        `Not enough wallet balance to lock this bounty. You have $${available.toFixed(2)} available — top up first.`,
      );
    }

    const { data: row, error } = await supabaseAdmin
      .from("requests")
      .insert({
        requester_id: context.userId,
        prompt: data.prompt,
        location_name: data.locationName,
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
