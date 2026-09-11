import { useEffect, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import { fetchTopReporters, type TopReporter } from "@/lib/leaderboard";
import { cn } from "@/lib/utils";

const MEDALS = ["text-signal", "text-foreground", "text-muted-foreground"];

/** Ranked list of the onlookers who have collected the most bounty cash. */
export function Leaderboard({
  limit = 10,
  showHeading = true,
  moreLink = false,
}: {
  limit?: number;
  showHeading?: boolean;
  moreLink?: boolean;
}) {
  const [rows, setRows] = useState<TopReporter[] | null>(null);

  useEffect(() => {
    let alive = true;
    fetchTopReporters(limit)
      .then((data) => alive && setRows(data))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, [limit]);

  return (
    <section className="mt-8">
      {showHeading && (
        <>
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-signal" />
            <h2 className="font-display text-lg text-foreground">Top reporters</h2>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            The onlookers who have earned the most bounty cash.
          </p>
        </>
      )}


      {rows === null ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Loading the rankings…
        </p>
      ) : rows.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No bounties collected yet. Send the first live view and take the top spot.
        </p>
      ) : (
        <ol className="mt-3 space-y-2">
          {rows.map((r, i) => (
            <li
              key={r.user_id}
              className={cn(
                "flex items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3",
                i === 0 && "border-signal/50 bg-surface-raised",
              )}
            >
              <span
                className={cn(
                  "w-6 shrink-0 text-center font-display text-lg",
                  MEDALS[i] ?? "text-muted-foreground",
                )}
              >
                {i + 1}
              </span>
              {r.avatar_url ? (
                <img
                  src={r.avatar_url}
                  alt={`${r.display_name} avatar`}
                  loading="lazy"
                  className="size-9 shrink-0 rounded-full object-cover"
                />
              ) : (
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-raised font-display text-sm text-foreground">
                  {r.display_name.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-1.5 truncate text-sm text-foreground">
                  {r.display_name}
                  {i === 0 && <Crown className="size-3.5 shrink-0 text-signal" />}
                </p>
                <p className="text-xs text-muted-foreground">
                  {r.clips} {r.clips === 1 ? "clip" : "clips"} sent
                </p>
              </div>
              <span className="font-display text-lg text-signal">
                ${r.total_earned.toFixed(0)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
