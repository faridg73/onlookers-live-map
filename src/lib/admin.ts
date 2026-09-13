import { supabase } from "@/integrations/supabase/client";

export type AdminPayout = {
  id: string;
  user_id: string;
  amount: number;
  destination: string;
  status: string;
  note: string;
  created_at: string;
  hunter_name: string;
};

/** True when the signed-in person carries the admin role. */
export async function isAdmin(): Promise<boolean> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return false;
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: auth.user.id,
    _role: "admin",
  });
  if (error) return false;
  return Boolean(data);
}

/** Every payout request in the system (admins only, enforced by access rules). */
export async function listAllPayoutRequests(): Promise<AdminPayout[]> {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, user_id, amount, destination, status, note, created_at")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  const rows = data ?? [];

  const ids = [...new Set(rows.map((r) => r.user_id))];
  const names: Record<string, string> = {};
  if (ids.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name")
      .in("id", ids);
    for (const p of profiles ?? []) names[p.id] = p.display_name;
  }

  return rows.map((row) => ({
    id: row.id,
    user_id: row.user_id,
    amount: Number(row.amount),
    destination: row.destination,
    status: row.status,
    note: row.note ?? "",
    created_at: row.created_at,
    hunter_name: names[row.user_id] ?? "Onlooker",
  }));
}

export type ModerationFlag = {
  id: string;
  user_id: string | null;
  title: string;
  details: string;
  matched_terms: string[];
  created_at: string;
};

/** Requests the content filter blocked, newest first (admins and moderators only). */
export async function listModerationFlags(): Promise<ModerationFlag[]> {
  const { data, error } = await supabase
    .from("moderation_flags")
    .select("id, user_id, title, details, matched_terms, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as ModerationFlag[];
}

export type DmcaNotice = {
  id: string;
  name: string;
  email: string;
  content_url: string;
  description: string;
  status: string;
  created_at: string;
};

/** DMCA / infringement reports, newest first (admins and moderators only). */
export async function listDmcaNotices(): Promise<DmcaNotice[]> {
  const { data, error } = await supabase
    .from("dmca_notices")
    .select("id, name, email, content_url, description, status, created_at")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as DmcaNotice[];
}

/** Approve (mark paid) or deny (return the money) a payout request. */
export async function resolvePayout(payoutId: string, approve: boolean, note = "") {
  const { error } = await supabase.rpc("resolve_payout", {
    _payout_id: payoutId,
    _approve: approve,
    _note: note,
  });
  if (error) throw new Error(error.message);
}

export type AdminMetrics = {
  gross_usd: number;
  platform_cut_usd: number;
  active_pins: number;
  pending_payouts_usd: number;
  expired_clips: number;
};

/** Headline platform numbers for the control center (admins and moderators only). */
export async function getPlatformMetrics(): Promise<AdminMetrics> {
  const { data, error } = await supabase.rpc("platform_metrics");
  if (error) throw error;
  const row = (data ?? [])[0];
  return {
    gross_usd: Number(row?.gross_usd ?? 0),
    platform_cut_usd: Number(row?.platform_cut_usd ?? 0),
    active_pins: Number(row?.active_pins ?? 0),
    pending_payouts_usd: Number(row?.pending_payouts_usd ?? 0),
    expired_clips: Number(row?.expired_clips ?? 0),
  };
}

export type ModerationEntry = {
  id: string;
  user_id: string | null;
  display_name: string;
  title: string;
  details: string;
  matched_terms: string[];
  warning_count: number;
  banned_at: string | null;
  created_at: string;
};

/** Blocked requests joined with the poster's warning and ban state. */
export async function listModerationLog(): Promise<ModerationEntry[]> {
  const { data, error } = await supabase.rpc("admin_moderation_log", { _limit: 200 });
  if (error) throw error;
  return (data ?? []) as ModerationEntry[];
}

export type PayoutQueueRow = {
  id: string;
  user_id: string;
  display_name: string;
  amount: number;
  credits_redeemed: number;
  credit_balance: number;
  destination: string;
  status: string;
  stripe_transfer_id: string | null;
  created_at: string;
};

/** Cash-out queue with each hunter's credit balance (admins only). */
export async function listPayoutQueue(): Promise<PayoutQueueRow[]> {
  const { data, error } = await supabase.rpc("admin_payout_queue");
  if (error) throw error;
  return ((data ?? []) as unknown as PayoutQueueRow[]).map((row) => ({
    ...row,
    amount: Number(row.amount),
  }));
}

/** Issue a formal warning to a member and notify them. */
export async function warnUser(userId: string, reason = ""): Promise<number> {
  const { data, error } = await supabase.rpc("admin_warn_user", {
    _user_id: userId,
    _reason: reason,
  });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}

/** Suspend a member so they can no longer post, claim, chat or upload. */
export async function banUser(userId: string, reason = ""): Promise<void> {
  const { error } = await supabase.rpc("admin_ban_user", { _user_id: userId, _reason: reason });
  if (error) throw new Error(error.message);
}

/** Lift a suspension. */
export async function unbanUser(userId: string): Promise<void> {
  const { error } = await supabase.rpc("admin_unban_user", { _user_id: userId });
  if (error) throw new Error(error.message);
}
