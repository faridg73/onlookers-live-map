import { supabase } from "@/integrations/supabase/client";

export type TopReporter = {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  total_earned: number;
  clips: number;
};

/** Highest-earning onlookers, ranked by total bounty cash collected. */
export async function fetchTopReporters(limit = 10): Promise<TopReporter[]> {
  const { data, error } = await supabase.rpc("top_reporters", { _limit: limit });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    user_id: row.user_id,
    display_name: row.display_name ?? "onlooker",
    avatar_url: row.avatar_url ?? null,
    total_earned: Number(row.total_earned ?? 0),
    clips: Number(row.clips ?? 0),
  }));
}
