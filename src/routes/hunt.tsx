import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, DollarSign, Navigation, Radio } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { useOnlooker } from "@/lib/onlooker-store";
import { useBoosts } from "@/lib/boosts-store";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { requestCurrentPosition } from "@/lib/geolocation";
import { distanceMiles, requestMapPosition, type MapPosition } from "@/lib/onlooker";

export const Route = createFileRoute("/hunt")({
  head: () => ({
    meta: [
      { title: "Hunter Dashboard — Earn on Onlooker" },
      {
        name: "description",
        content:
          "See every open bounty near you with the payout, the time left and how far you have to walk.",
      },
      { property: "og:title", content: "Hunter Dashboard — Earn on Onlooker" },
      {
        property: "og:description",
        content: "Open bounties near you with payout, time left and distance.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: HuntScreen,
});

type Sort = "distance" | "payout" | "urgency";

const SORTS: { key: Sort; label: string }[] = [
  { key: "distance", label: "Closest" },
  { key: "payout", label: "Top pay" },
  { key: "urgency", label: "Ending soon" },
];

function minutesLeft(expiresAt?: number, expiresInMin?: number) {
  if (expiresAt) return Math.max(0, Math.round((expiresAt - Date.now()) / 60_000));
  return expiresInMin ?? 0;
}

function HuntScreen() {
  const { requests, claim } = useOnlooker();
  const { boostOf } = useBoosts();
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("distance");
  const { formatDistance, radius, unit } = useDistanceUnit(position);

  const locate = async () => {
    setError(null);
    try {
      const { coords } = await requestCurrentPosition();
      setPosition({ lat: coords.latitude, lng: coords.longitude });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Location is unavailable.");
    }
  };

  useEffect(() => {
    void locate();
  }, []);

  const open = useMemo(
    () => requests.filter((r) => r.status === "open"),
    [requests],
  );

  const list = useMemo(() => {
    const withMeta = open.map((r) => ({
      request: r,
      payout: r.bounty + boostOf(r.id),
      left: minutesLeft(r.expiresAt, r.expiresInMin),
      miles: position ? distanceMiles(position, requestMapPosition(r)) : null,
    }));
    return withMeta.sort((a, b) => {
      if (sort === "payout") return b.payout - a.payout;
      if (sort === "urgency") return a.left - b.left;
      if (a.miles === null || b.miles === null) return b.payout - a.payout;
      return a.miles - b.miles;
    });
  }, [open, position, sort, boostOf]);

  const potential = list.reduce((sum, row) => sum + row.payout, 0);
  const nearby = list.filter((row) => row.miles !== null && row.miles <= radius).length;

  const stat = "rounded-2xl border border-border bg-surface p-3";

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl tracking-tight text-foreground">Hunter dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Open bounties you can claim right now, ranked for the fastest payout.
      </p>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className={stat}>
          <DollarSign className="size-4 text-signal" aria-hidden />
          <p className="mt-1 font-display text-xl text-foreground">${potential}</p>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            On the table
          </p>
        </div>
        <div className={stat}>
          <Radio className="size-4 text-signal" aria-hidden />
          <p className="mt-1 font-display text-xl text-foreground">{list.length}</p>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Open now
          </p>
        </div>
        <div className={stat}>
          <Navigation className="size-4 text-signal" aria-hidden />
          <p className="mt-1 font-display text-xl text-foreground">{position ? nearby : "—"}</p>
          <p className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            Within {radius} {unit}
          </p>
        </div>
      </div>

      {!position && (
        <button
          type="button"
          onClick={locate}
          className="mt-3 w-full rounded-xl border border-signal bg-surface px-3 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-signal"
        >
          {error ? "Retry location" : "Turn on location to rank by distance"}
        </button>
      )}
      {error && !position && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {error}
        </p>
      )}

      <div className="mt-5 grid grid-cols-3 gap-1.5">
        {SORTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => setSort(s.key)}
            aria-pressed={sort === s.key}
            className={
              "rounded-lg border px-2 py-2 text-[0.66rem] font-bold uppercase tracking-[0.1em] transition-colors " +
              (sort === s.key
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground")
            }
          >
            {s.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {list.map(({ request, payout, left, miles }) => (
          <div key={request.id}>
            <div className="flex items-center justify-between px-1 pb-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.1em]">
              <span className="text-signal">Earn ${payout}</span>
              <span className="flex items-center gap-2 text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="size-3" aria-hidden /> {left} min left
                </span>
                {miles !== null && (
                  <span className="flex items-center gap-1">
                    <Navigation className="size-3" aria-hidden /> {formatDistance(miles)}
                  </span>
                )}
              </span>
            </div>
            <BountyDetailsDialog request={request} onClaim={claim}>
              <RequestCard
                request={request}
                compact
                distanceLabel={miles !== null ? formatDistance(miles) : undefined}
              />
            </BountyDetailsDialog>
          </div>
        ))}
        {list.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No open bounties right now. Check back in a few minutes.
          </p>
        )}
      </div>
    </div>
  );
}
