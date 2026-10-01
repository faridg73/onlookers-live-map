// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

export type ProfileActivityKind = "claimed" | "posted" | "submitted" | "completed" | "streamed";
export type ProfileActivityItem = { id: string; kind: ProfileActivityKind; title: string; credits: number | null; occurredAt: string };

/** Newest real bounty and broadcast actions for the signed-in member. */
export const listMyRecentActivity = createServerFn({ method: "GET" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<ProfileActivityItem[]> => {
    const [posted, claims, videos, streams] = await Promise.all([
      context.supabase.from("requests").select("id, prompt, bounty_amount, status, created_at, updated_at").eq("requester_id", context.userId).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("claims").select("id, request_id, claimed_at").eq("spotter_id", context.userId).order("claimed_at", { ascending: false }).limit(20),
      context.supabase.from("bounty_videos").select("id, request_id, request_title, payout_amount, created_at, accepted_at").eq("uploader_id", context.userId).order("created_at", { ascending: false }).limit(20),
      context.supabase.from("stream_sessions").select("id, request_id, credits_earned, started_at").eq("host_id", context.userId).order("started_at", { ascending: false }).limit(20),
    ]);
    const firstError = [posted.error, claims.error, videos.error, streams.error].find(Boolean);
    if (firstError) throw new Error(firstError.message);

    const requestIds = Array.from(new Set([
      ...(claims.data ?? []).map((row) => row.request_id),
      ...(streams.data ?? []).map((row) => row.request_id).filter((id): id is string => Boolean(id)),
    ]));
    const linkedRequests = requestIds.length
      ? await context.supabase.from("requests").select("id, prompt, bounty_amount").in("id", requestIds)
      : { data: [], error: null };
    if (linkedRequests.error) throw new Error(linkedRequests.error.message);
    const requestById = new Map((linkedRequests.data ?? []).map((row) => [row.id, row]));

    const items: ProfileActivityItem[] = [
      ...(posted.data ?? []).map((row): ProfileActivityItem => ({
        id: `posted-${row.id}`,
        kind: row.status === "completed" ? "completed" : "posted",
        title: row.prompt,
        credits: Number(row.bounty_amount),
        occurredAt: row.status === "completed" ? row.updated_at : row.created_at,
      })),
      ...(claims.data ?? []).map((row): ProfileActivityItem => {
        const request = requestById.get(row.request_id);
        return { id: `claim-${row.id}`, kind: "claimed", title: request?.prompt ?? "Bounty request", credits: request ? Number(request.bounty_amount) : null, occurredAt: row.claimed_at };
      }),
      ...(videos.data ?? []).map((row): ProfileActivityItem => ({
        id: `video-${row.id}`,
        kind: row.accepted_at ? "completed" : "submitted",
        title: row.request_title || "Bounty footage",
        credits: row.accepted_at ? Number(row.payout_amount) : null,
        occurredAt: row.accepted_at ?? row.created_at,
      })),
      ...(streams.data ?? []).map((row): ProfileActivityItem => {
        const request = row.request_id ? requestById.get(row.request_id) : null;
        return { id: `stream-${row.id}`, kind: "streamed", title: request?.prompt ?? "Clip", credits: Number(row.credits_earned) || null, occurredAt: row.started_at };
      }),
    ];

    return items
      .filter((item) => !Number.isNaN(new Date(item.occurredAt).getTime()))
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 20);
  });