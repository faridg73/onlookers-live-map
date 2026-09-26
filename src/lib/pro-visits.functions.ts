// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

const bookingSchema = z.object({
  address: z.string().trim().min(5).max(200),
  purpose: z.string().trim().min(10).max(1000),
  scheduledStartAt: z.string().datetime({ offset: true }).nullable(),
  contactName: z.string().trim().min(1).max(120),
  contactPhone: z.string().trim().max(30),
  contactEmail: z.string().trim().email().or(z.literal("")),
}).refine((value) => value.contactPhone || value.contactEmail, {
  message: "Add a phone or email for the on-site contact.",
});

const bookingIdSchema = z.object({ bookingId: z.string().uuid() });
const linkSchema = bookingIdSchema.extend({ requestId: z.string().uuid() });

export type ProVisitBooking = {
  id: string;
  address: string;
  purpose: string;
  scheduledStartAt: string | null;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  requestId: string | null;
  bookingStatus: "draft" | "published" | "cancelled";
  requestStatus: string | null;
  requestExpiresAt: string | null;
  createdAt: string;
  bountyAmount?: number;
  escrowStatus?: string | null;
  escrowAmount?: number;
  reservedUntil?: string | null;
  autoReleaseAt?: string | null;
  submissionCount?: number;
  payoutAmount?: number;
  claimStatus?: string | null;
};

export type ProDashboardData = {
  account: {
    company: string;
    role: "agent" | "property_manager" | "home_builder";
    plan: "none" | "starter" | "pro" | "team";
    visitsUsed: number;
    periodStart: string | null;
  } | null;
  bookings: ProVisitBooking[];
};

/** Owner-scoped check used to send established professionals straight to their dashboard. */
export const hasMyProAccount = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<boolean> => {
    const { data, error } = await context.supabase
      .from("pro_accounts")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return Boolean(data);
  });

export const getMyProDashboard = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProDashboardData> => {
    const { data: account, error: accountError } = await context.supabase
      .from("pro_accounts")
      .select("company, pro_role, plan, visits_used, visit_period_start")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (accountError) throw new Error(accountError.message);
    if (!account) return { account: null, bookings: [] };

    const { data: bookings, error } = await context.supabase
      .from("pro_visit_bookings")
      .select("id, address, purpose, scheduled_start_at, contact_name, contact_phone, contact_email, request_id, booking_status, created_at")
      .eq("owner_id", context.userId)
      .order("scheduled_start_at", { ascending: true, nullsFirst: false })
      .limit(200);
    if (error) throw new Error(error.message);

    const requestIds = (bookings ?? []).map((row) => row.request_id).filter((id): id is string => Boolean(id));
    const requestById = new Map<string, { status: string; expires_at: string; bounty_amount: number }>();
    const escrowById = new Map<string, { status: string; amount: number; reserved_until: string | null; auto_release_at: string | null }>();
    const videoById = new Map<string, { count: number; payout: number }>();
    const claimById = new Map<string, { status: string }>();
    if (requestIds.length > 0) {
      const [requests, escrows, videos, claims] = await Promise.all([
        context.supabase.from("requests").select("id, status, expires_at, bounty_amount").eq("requester_id", context.userId).in("id", requestIds),
        context.supabase.from("escrows").select("request_id, status, amount, reserved_until, auto_release_at").in("request_id", requestIds),
        context.supabase.from("bounty_videos").select("request_id, accepted_at, payout_amount").in("request_id", requestIds),
        context.supabase.from("claims").select("request_id, status").in("request_id", requestIds),
      ]);
      if (requests.error) throw new Error(requests.error.message);
      if (escrows.error) throw new Error(escrows.error.message);
      if (videos.error) throw new Error(videos.error.message);
      if (claims.error) throw new Error(claims.error.message);
      for (const row of requests.data ?? []) requestById.set(row.id, row);
      for (const row of escrows.data ?? []) escrowById.set(row.request_id, row);
      for (const row of videos.data ?? []) {
        const current = videoById.get(row.request_id) ?? { count: 0, payout: 0 };
        current.count += 1;
        if (row.accepted_at) current.payout += Number(row.payout_amount ?? 0);
        videoById.set(row.request_id, current);
      }
      for (const row of claims.data ?? []) claimById.set(row.request_id, row);
    }

    return {
      account: {
        company: account.company,
        role: account.pro_role as NonNullable<ProDashboardData["account"]>["role"],
        plan: account.plan as NonNullable<ProDashboardData["account"]>["plan"],
        visitsUsed: account.visits_used,
        periodStart: account.visit_period_start,
      },
      bookings: (bookings ?? []).map((booking) => {
        const request = booking.request_id ? requestById.get(booking.request_id) : undefined;
        const escrow = booking.request_id ? escrowById.get(booking.request_id) : undefined;
        const media = booking.request_id ? videoById.get(booking.request_id) : undefined;
        return {
          id: booking.id, address: booking.address, purpose: booking.purpose,
          scheduledStartAt: booking.scheduled_start_at, contactName: booking.contact_name,
          contactPhone: booking.contact_phone, contactEmail: booking.contact_email,
          requestId: booking.request_id,
          bookingStatus: booking.booking_status === "published" ? "published" : booking.booking_status === "cancelled" ? "cancelled" : "draft",
          requestStatus: request?.status ?? null, requestExpiresAt: request?.expires_at ?? null,
          createdAt: booking.created_at, bountyAmount: Number(request?.bounty_amount ?? 0),
          escrowStatus: escrow?.status ?? null, escrowAmount: Number(escrow?.amount ?? 0),
          reservedUntil: escrow?.reserved_until ?? null, autoReleaseAt: escrow?.auto_release_at ?? null,
          submissionCount: media?.count ?? 0, payoutAmount: media?.payout ?? 0,
          claimStatus: booking.request_id ? claimById.get(booking.request_id)?.status ?? null : null,
        };
      }),
    };
  });

export const createProVisitBooking = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => bookingSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ id: string }> => {
    const { data: account, error: accountError } = await context.supabase
      .from("pro_accounts")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (accountError) throw new Error(accountError.message);
    if (!account) throw new Error("Create your professional account before scheduling a visit.");

    const { data: row, error } = await context.supabase
      .from("pro_visit_bookings")
      .insert({
        owner_id: context.userId,
        address: data.address,
        purpose: data.purpose,
        scheduled_start_at: data.scheduledStartAt,
        contact_name: data.contactName,
        contact_phone: data.contactPhone,
        contact_email: data.contactEmail,
      })
      .select("id")
      .single();
    if (error || !row) throw new Error(error?.message ?? "Could not save this visit.");
    return { id: row.id };
  });

export const listMyProVisitBookings = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProVisitBooking[]> => {
    const { data: account, error: accountError } = await context.supabase
      .from("pro_accounts")
      .select("user_id")
      .eq("user_id", context.userId)
      .maybeSingle();
    if (accountError) throw new Error(accountError.message);
    if (!account) return [];

    const { data: bookings, error } = await context.supabase
      .from("pro_visit_bookings")
      .select("id, address, purpose, scheduled_start_at, contact_name, contact_phone, contact_email, request_id, booking_status, created_at")
      .eq("owner_id", context.userId)
      .order("created_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);

    const requestIds = (bookings ?? [])
      .map((booking) => booking.request_id)
      .filter((id): id is string => Boolean(id));
    const requestById = new Map<string, { status: string; expires_at: string }>();
    if (requestIds.length > 0) {
      const { data: requests, error: requestError } = await context.supabase
        .from("requests")
        .select("id, status, expires_at")
        .eq("requester_id", context.userId)
        .in("id", requestIds);
      if (requestError) throw new Error(requestError.message);
      for (const request of requests ?? []) requestById.set(request.id, request);
    }

    return (bookings ?? []).map((booking) => {
      const request = booking.request_id ? requestById.get(booking.request_id) : undefined;
      return {
        id: booking.id,
        address: booking.address,
        purpose: booking.purpose,
        scheduledStartAt: booking.scheduled_start_at,
        contactName: booking.contact_name,
        contactPhone: booking.contact_phone,
        contactEmail: booking.contact_email,
        requestId: booking.request_id,
        bookingStatus: booking.booking_status === "published"
          ? "published"
          : booking.booking_status === "cancelled"
            ? "cancelled"
            : "draft",
        requestStatus: request?.status ?? null,
        requestExpiresAt: request?.expires_at ?? null,
        createdAt: booking.created_at,
      };
    });
  });

export const getMyProVisitBooking = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => bookingIdSchema.parse(data))
  .handler(async ({ data, context }): Promise<ProVisitBooking> => {
    const { data: booking, error } = await context.supabase
      .from("pro_visit_bookings")
      .select("id, address, purpose, scheduled_start_at, contact_name, contact_phone, contact_email, request_id, booking_status, created_at")
      .eq("id", data.bookingId)
      .eq("owner_id", context.userId)
      .single();
    if (error || !booking) throw new Error("That saved visit could not be found.");
    return {
      id: booking.id,
      address: booking.address,
      purpose: booking.purpose,
      scheduledStartAt: booking.scheduled_start_at,
      contactName: booking.contact_name,
      contactPhone: booking.contact_phone,
      contactEmail: booking.contact_email,
      requestId: booking.request_id,
      bookingStatus: booking.booking_status === "published"
        ? "published"
        : booking.booking_status === "cancelled"
          ? "cancelled"
          : "draft",
      requestStatus: null,
      requestExpiresAt: null,
      createdAt: booking.created_at,
    };
  });

export const linkProVisitBooking = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => linkSchema.parse(data))
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { data: request, error: requestError } = await context.supabase
      .from("requests")
      .select("id")
      .eq("id", data.requestId)
      .eq("requester_id", context.userId)
      .eq("category", "realestate")
      .maybeSingle();
    if (requestError) throw new Error(requestError.message);
    if (!request) throw new Error("Only your verified visit bounty can be linked.");

    const { data: rows, error } = await context.supabase
      .from("pro_visit_bookings")
      .update({ request_id: data.requestId, booking_status: "published" })
      .eq("id", data.bookingId)
      .eq("owner_id", context.userId)
      .is("request_id", null)
      .select("id");
    if (error) throw new Error(error.message);
    if (!rows || rows.length === 0) throw new Error("That saved visit is already linked or unavailable.");
    return { ok: true };
  });