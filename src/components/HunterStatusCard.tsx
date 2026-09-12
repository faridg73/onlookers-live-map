import { useEffect, useState } from "react";
import { EyeOff, PartyPopper, Trophy } from "lucide-react";
import { toast } from "sonner";
import { HunterBadge } from "@/components/HunterBadge";
import { TrustBadge } from "@/components/TrustBadge";
import { Switch } from "@/components/ui/switch";
import { fetchTrustStats, type TrustStats } from "@/lib/trust";
import {
  XP_PER_BOUNTY,
  XP_PER_LEVEL,
  fetchHunterStats,
  setIncognito,
  tierForLevel,
  xpToNextLevel,
  type HunterStats,
} from "@/lib/gamification";

const SEEN_LEVEL_KEY = "onlooker.seen-level";

/** Status, experience progress and the privacy mask toggle. */
export function HunterStatusCard() {
  const [stats, setStats] = useState<HunterStats | null>(null);
  const [saving, setSaving] = useState(false);
  const [celebrating, setCelebrating] = useState(false);

  useEffect(() => {
    void fetchHunterStats().then((next) => {
      setStats(next);
      if (!next) return;
      try {
        const seen = Number(localStorage.getItem(SEEN_LEVEL_KEY) ?? "0");
        if (next.hunterLevel > seen) {
          localStorage.setItem(SEEN_LEVEL_KEY, String(next.hunterLevel));
          if (seen > 0) setCelebrating(true);
        }
      } catch {
        /* storage unavailable */
      }
    });
  }, []);

  if (!stats) return null;

  const tier = tierForLevel(stats.hunterLevel);
  const progress = ((stats.xp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100;

  async function toggle(on: boolean) {
    setSaving(true);
    try {
      await setIncognito(on);
      setStats((prev) => (prev ? { ...prev, isIncognito: on } : prev));
      toast.success(on ? "Incognito mode is on." : "Incognito mode is off.");
    } catch {
      toast.error("That setting could not be saved.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="mt-6 space-y-3">
      <div className="rounded-2xl border border-border bg-surface p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
            <Trophy className="size-4 text-signal" /> {tier.name} onlooker
          </span>
          <HunterBadge level={stats.hunterLevel} />
        </div>

        {celebrating && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-signal/15 px-3 py-2 text-xs font-bold text-signal">
            <PartyPopper className="size-4" /> Level up! You reached level {stats.hunterLevel}.
          </p>
        )}

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-surface-raised">
          <div className="h-full rounded-full bg-signal" style={{ width: `${progress}%` }} />
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {stats.xp} XP · {xpToNextLevel(stats.xp)} XP to level {stats.hunterLevel + 1} · every
          finished bounty earns {XP_PER_BOUNTY} XP.
        </p>
      </div>

      <div className="flex items-start justify-between gap-4 rounded-2xl border border-border bg-surface p-4">
        <div className="min-w-0">
          <p className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
            <EyeOff className="size-4 text-signal" /> Incognito mode
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Show up as <span className="font-bold text-foreground">{stats.alias}</span> with a
            generic avatar, and hide your exact spot on the map while you head to a bounty.
          </p>
        </div>
        <Switch
          checked={stats.isIncognito}
          disabled={saving}
          onCheckedChange={(next) => void toggle(next)}
          aria-label="Incognito mode"
        />
      </div>
    </section>
  );
}
