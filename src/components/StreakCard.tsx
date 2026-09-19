// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { Flame, Rocket, Trophy } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  fetchStreak,
  recordDailyEngagement,
  STREAK_MILESTONES,
  type StreakState,
} from "@/lib/streaks";

/**
 * Daily streak card: checks the member in on their first visit of the day and
 * shows the milestone Credits and free post-boost passes they've earned.
 */
export function StreakCard() {
  const { user } = useAuth();
  const [streak, setStreak] = useState<StreakState | null>(null);

  useEffect(() => {
    if (!user) {
      setStreak(null);
      return;
    }
    let alive = true;
    void (async () => {
      try {
        const result = await recordDailyEngagement();
        if (result && !result.alreadyCheckedIn) {
          if (result.awardedCredits > 0) {
            toast.success(`Day ${result.currentStreak} streak! +${result.awardedCredits} Credits`, {
              description: result.awardedPass ? "You also earned a free post-boost pass." : undefined,
            });
          } else {
            toast.success(`Day ${result.currentStreak} streak. Keep it going.`);
          }
        }
      } catch {
        /* streaks are a bonus, never block the profile */
      }
      const next = await fetchStreak();
      if (alive) setStreak(next);
    })();
    return () => {
      alive = false;
    };
  }, [user]);

  if (!user) return null;

  const current = streak?.currentStreak ?? 0;
  const upcoming = STREAK_MILESTONES.find((m) => m.days > current) ?? STREAK_MILESTONES[3];

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
          <Flame className="size-5 text-signal" /> Daily streak
        </h2>
        <span className="font-display text-2xl text-signal">{current}d</span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-center">
        <div className="rounded-xl border border-border bg-surface-raised p-3">
          <Trophy className="mx-auto size-4 text-signal" />
          <div className="mt-1 font-display text-lg text-foreground">
            {streak?.longestStreak ?? 0}
          </div>
          <div className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">Best</div>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-3">
          <Rocket className="mx-auto size-4 text-signal" />
          <div className="mt-1 font-display text-lg text-foreground">
            {streak?.boostPasses ?? 0}
          </div>
          <div className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            Boost passes
          </div>
        </div>
        <div className="rounded-xl border border-border bg-surface-raised p-3">
          <Flame className="mx-auto size-4 text-signal" />
          <div className="mt-1 font-display text-lg text-foreground">
            {streak?.rewardCreditsTotal ?? 0}
          </div>
          <div className="text-[0.6rem] uppercase tracking-[0.14em] text-muted-foreground">
            Bonus credits
          </div>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        Next reward at day {upcoming.days}: {upcoming.reward}. Open the app every day to keep your
        streak alive.
      </p>
    </section>
  );
}
