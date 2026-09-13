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
