import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Flame } from "lucide-react";
import { fetchTopReportersWeekly, type TopReporter } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

/** Small gamified ranking of who earned the most bounty cash in the last 7 days. */
export function WeeklyTopOnlookers({ limit = 5 }: { limit?: number }) {
  const [rows, setRows] = useState<TopReporter[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTopReportersWeekly(limit)
      .then((data) => alive && setRows(data))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [limit]);

  return (
    <section className="mt-8 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Flame className="size-4 text-signal" />
          <h2 className="font-display text-base text-foreground">Top onlookers this week</h2>
        </div>
        <Link to="/leaderboard" className="text-xs font-semibold text-signal">
          All time
        </Link>
      </div>

      {rows === null ? (
        <p className="mt-3 text-sm text-muted-foreground">Counting this week’s payouts…</p>
      ) : rows.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">
          Nobody has been paid this week yet — send a clip and take the top spot.
        </p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className={cn(
                "flex items-center gap-3 rounded-xl px-2 py-2",
                i === 0 && "bg-surface-raised",
              )}
            >
              <span className="w-5 text-center font-display text-sm text-muted-foreground">
                {i + 1}
              </span>
              {r.avatar_url ? (
                <img
                  src={r.avatar_url}
                  alt={`${r.display_name} avatar`}
                  loading="lazy"
                  className="size-7 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-raised text-[0.65rem] text-foreground">
                  {r.display_name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                {r.display_name}
              </span>
              <span className="text-xs text-muted-foreground">
                {r.clips} {r.clips === 1 ? "clip" : "clips"}
              </span>
              <span className="font-display text-sm text-signal">
                ${r.total_earned.toFixed(0)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
