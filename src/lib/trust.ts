import { supabase } from "@/integrations/supabase/client";

/** Public reliability record used for the Verified reporter badge. */
export type TrustStats = {
  totalClaims: number;
  completedClaims: number;
  completionRate: number;
  avgResponseMinutes: number;
  hunterLevel: number;
  xp: number;
  verified: boolean;
};

export async function fetchTrustStats(userId?: string): Promise<TrustStats | null> {
  let id = userId;
  if (!id) {
    const { data: auth } = await supabase.auth.getUser();
    if (!auth.user) return null;
    id = auth.user.id;
  }
  const { data, error } = await supabase.rpc("hunter_trust", { _user_id: id });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row) return null;
  return {
    totalClaims: row.total_claims ?? 0,
    completedClaims: row.completed_claims ?? 0,
    completionRate: Number(row.completion_rate ?? 0),
    avgResponseMinutes: Number(row.avg_response_minutes ?? 0),
    hunterLevel: row.hunter_level ?? 1,
    xp: row.xp ?? 0,
    verified: Boolean(row.verified),
  };
}

/** Short, friendly summary of how fast someone usually turns a job around. */
export function responseLabel(minutes: number) {
  if (minutes <= 0) return "No jobs yet";
  if (minutes < 60) return `${Math.round(minutes)} min average`;
  const hours = minutes / 60;
  return `${hours < 10 ? hours.toFixed(1) : Math.round(hours)} hr average`;
}
