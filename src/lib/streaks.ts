import { supabase } from "@/integrations/supabase/client";

/** Daily engagement streak, milestone Credits and free post-boost passes. */
export type StreakState = {
  currentStreak: number;
  longestStreak: number;
  totalDays: number;
  boostPasses: number;
  rewardCreditsTotal: number;
  lastActiveOn: string | null;
};

export type CheckInResult = {
  currentStreak: number;
  longestStreak: number;
  boostPasses: number;
  awardedCredits: number;
  awardedPass: boolean;
  alreadyCheckedIn: boolean;
};

/** Milestones shown on the streak card, in days. */
export const STREAK_MILESTONES = [
  { days: 3, reward: "2 Credits" },
  { days: 7, reward: "5 Credits + boost pass" },
  { days: 14, reward: "10 Credits" },
  { days: 30, reward: "25 Credits" },
] as const;

export async function fetchStreak(): Promise<StreakState | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("engagement_streaks")
    .select(
      "current_streak, longest_streak, total_days, boost_passes, reward_credits_total, last_active_on",
    )
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    currentStreak: data.current_streak,
    longestStreak: data.longest_streak,
    totalDays: data.total_days,
    boostPasses: data.boost_passes,
    rewardCreditsTotal: data.reward_credits_total,
    lastActiveOn: data.last_active_on,
  };
}

/** Records today's visit; safe to call repeatedly (only the first counts). */
export async function recordDailyEngagement(): Promise<CheckInResult | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase.rpc("record_daily_engagement", {});
  if (error) throw new Error(error.message);
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return null;
  return {
    currentStreak: row.current_streak ?? 0,
    longestStreak: row.longest_streak ?? 0,
    boostPasses: row.boost_passes ?? 0,
    awardedCredits: row.awarded_credits ?? 0,
    awardedPass: row.awarded_pass ?? false,
    alreadyCheckedIn: row.already_checked_in ?? false,
  };
}

/** Next milestone still ahead of the current streak. */
export function nextMilestone(streak: number) {
  return STREAK_MILESTONES.find((m) => m.days > streak % 30 || m.days > streak) ?? STREAK_MILESTONES[3];
}
