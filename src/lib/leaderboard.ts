// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrls } from "@/lib/profile";

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
  return withResolvedAvatars(data ?? []);
}

/** Highest earners over the last 7 days, for the weekly mini-leaderboard. */
export async function fetchTopReportersWeekly(limit = 5): Promise<TopReporter[]> {
  const { data, error } = await supabase.rpc("top_reporters_weekly", { _limit: limit });
  if (error) throw error;
  return withResolvedAvatars(data ?? []);
}

async function withResolvedAvatars(
  rows: { user_id: string; display_name: string | null; avatar_url: string | null; total_earned: number; clips: number }[],
): Promise<TopReporter[]> {
  const avatars = await resolveAvatarUrls(rows.map((row) => row.avatar_url));
  return rows.map((row, i) => ({
    user_id: row.user_id,
    display_name: row.display_name ?? "onlooker",
    avatar_url: avatars[i] ?? null,
    total_earned: Number(row.total_earned ?? 0),
    clips: Number(row.clips ?? 0),
  }));
}
