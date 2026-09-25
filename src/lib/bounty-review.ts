// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";

/** Strip the local "db-" prefix the app uses for database-backed request ids. */
function rawRequestId(requestId: string) {
  return requestId.startsWith("db-") ? requestId.slice(3) : requestId;
}

export type ReviewWindow = {
  status: string;
  autoReleaseAt: string | null;
  canDispute: boolean;
};

/** When the submitted clip auto-approves, and whether the poster may still report it. */
export async function getReviewWindow(requestId: string | null): Promise<ReviewWindow | null> {
  if (!requestId) return null;
  const { data, error } = await supabase.rpc("bounty_review_window", {
    _request_id: rawRequestId(requestId),
  });
  if (error) return null;
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    status: String(row.status ?? ""),
    autoReleaseAt: (row.auto_release_at as string | null) ?? null,
    canDispute: Boolean(row.can_dispute),
  };
}

export type DisputeStats = {
  reviewed: number;
  disputed: number;
  rate: number;
};

/** How often this poster reports the work they receive. */
export async function getPosterDisputeStats(userId?: string): Promise<DisputeStats | null> {
  const { data, error } = await supabase.rpc("poster_dispute_stats", {
    _user_id: userId ?? undefined,
  });
  if (error) return null;
  const row = (data ?? [])[0];
  if (!row) return null;
  return {
    reviewed: Number(row.reviewed_count ?? 0),
    disputed: Number(row.disputed_count ?? 0),
    rate: Number(row.dispute_rate ?? 0),
  };
}

/** "1h 42m" style countdown text, or null once the moment has passed. */
export function countdownLabel(iso: string | null, now: number = Date.now()): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours >= 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${Math.max(1, minutes)}m`;
}
