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
  bookingStatus: "draft" | "published";
  requestStatus: string | null;
  requestExpiresAt: string | null;
  createdAt: string;
};

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
    if (!account) throw new Error("Professional account required.");

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
        bookingStatus: booking.booking_status === "published" ? "published" : "draft",
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
      bookingStatus: booking.booking_status === "published" ? "published" : "draft",
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