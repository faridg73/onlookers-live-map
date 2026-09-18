import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { awardReputation, fetchMyReputation } from "@/lib/reputation";
import { fetchMyTrustLevel, trustTier, type TrustLevel } from "@/lib/trust-tiers";

/** Shows the member's trust level, what it unlocks and the next step up. */
export function TrustLevelBadge({ className = "" }: { className?: string }) {
  const [level, setLevel] = useState<TrustLevel | null>(null);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    let active = true;
    void Promise.all([fetchMyTrustLevel(), fetchMyReputation()]).then(([next, total]) => {
      if (!active) return;
      setLevel(next);
      setPoints(total);
    });
    return () => {
      active = false;
    };
  }, []);

  if (level === null) return null;
  const tier = trustTier(level);

  return (
    <div className={`rounded-2xl border border-border bg-surface p-4 ${className}`}>
      <div className="flex items-center justify-between gap-3">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[0.68rem] font-extrabold uppercase tracking-[0.1em] ${tier.badge}`}
        >
          <ShieldCheck className="size-3.5" /> Level {tier.level} · {tier.name}
        </span>
        <span className="shrink-0 text-xs font-bold text-muted-foreground">{points} pts</span>
      </div>
      <p className="mt-2 text-sm text-foreground">{tier.unlocks}</p>
      {tier.nextStep && <p className="mt-1 text-xs text-muted-foreground">{tier.nextStep}</p>}
      <button
        type="button"
        onClick={() => {
          void awardReputation("safety_tutorial", "v1").then((total) => {
            if (total === null) return;
            setPoints(total);
            void fetchMyTrustLevel().then(setLevel);
          });
        }}
        className="mt-3 w-full rounded-xl border border-signal/50 px-3 py-2 text-xs font-bold uppercase tracking-[0.1em] text-signal"
      >
        Finish safety tutorial (+10 pts)
      </button>
    </div>
  );
}
