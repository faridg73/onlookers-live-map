import { Flame, MapPin } from "lucide-react";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import type { LiveRequest } from "@/lib/onlooker";

/**
 * Popular open view requests from anywhere in the world, shown under an empty
 * search box so there is always something live to look at.
 */
export function TrendingViewRequests({
  onOpen,
  limit = 5,
  className = "",
}: {
  onOpen: (request: LiveRequest) => void;
  limit?: number;
  className?: string;
}) {
  const { requests } = useOnlooker();

  const trending = requests
    .filter((request) => request.status === "open" && !isClosed(request))
    .sort((a, b) => b.bounty - a.bounty || b.watchers - a.watchers)
    .slice(0, limit);

  if (trending.length === 0) return null;

  return (
    <section className={className} aria-label="Trending view requests">
      <p className="flex items-center gap-1.5 px-1 text-[0.66rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
        <Flame className="size-3.5 text-signal" aria-hidden /> Trending worldwide
      </p>
      <ul className="mt-2 space-y-1.5">
        {trending.map((request) => (
          <li key={request.id}>
            <button
              type="button"
              onClick={() => onOpen(request)}
              className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-left"
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                <span className="mt-0.5 flex items-center gap-1 text-[0.7rem] text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden />
                  <span className="truncate">{request.place}</span>
                </span>
              </span>
              <span className="shrink-0 font-display text-base font-extrabold text-signal">
                {request.bounty} cr
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
