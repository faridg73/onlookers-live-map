// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Clock, CoinsIcon, Navigation, Radio, X } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { HunterEarningBanner } from "@/components/HunterEarningBanner";
import { LiveBountyMapBox, type LiveBountyPin } from "@/components/LiveBountyMapBox";
import { UrgencyBadge } from "@/components/UrgencyBadge";
import { formatCredits } from "@/lib/credits";
import { useOnlooker } from "@/lib/onlooker-store";
import { useBoosts } from "@/lib/boosts-store";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { requestCurrentPosition } from "@/lib/geolocation";
import { distanceMiles, requestMapPosition, type MapPosition } from "@/lib/onlooker";

export const Route = createFileRoute("/hunt")({
  head: () => ({
    meta: [
      { title: "Hunter Dashboard, Earn on Onlooker" },
      {
        name: "description",
        content:
          "See every open bounty near you with the payout, the time left and how far you have to walk.",
      },
      { property: "og:title", content: "Hunter Dashboard, Earn on Onlooker" },
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

/**
 * Suggested hunting distances. `null` means no distance filter at all — hunters
 * in low-density areas can always see every open bounty. Shortcuts only: the
 * custom field below takes any number, there is no platform maximum.
 */
const RADIUS_PRESETS_MI = [5, 25, 50, 100, 250, 500] as const;

function HuntScreen() {
  const { requests, claim } = useOnlooker();
  const { boostOf } = useBoosts();
  const [position, setPosition] = useState<MapPosition | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("distance");
  /** null = no distance filter (every open bounty, anywhere). */
  const [radiusMiles, setRadiusMiles] = useState<number | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const { formatDistance, unit } = useDistanceUnit(position);
  const toDisplay = (miles: number) => (unit === "mi" ? miles : miles * 1.609344);
  const fromDisplay = (value: number) => (unit === "mi" ? value : value / 1.609344);
  const radiusText =
    radiusMiles === null ? "Anywhere" : `${Math.round(toDisplay(radiusMiles))} ${unit}`;
  const router = useRouter();
  const canGoBack = useCanGoBack();

  const close = () => {
    if (canGoBack) router.history.back();
    else void router.navigate({ to: "/" });
  };

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
    // The chosen distance is the only filter, and it is always optional.
    const inRange =
      radiusMiles === null
        ? withMeta
        : withMeta.filter((row) => row.miles === null || row.miles <= radiusMiles);
    return inRange.sort((a, b) => {
      if (sort === "payout") return b.payout - a.payout;
      if (sort === "urgency") return a.left - b.left;
      if (a.miles === null || b.miles === null) return b.payout - a.payout;
      return a.miles - b.miles;
    });
  }, [open, position, sort, boostOf, radiusMiles]);

  const potential = list.reduce((sum, row) => sum + row.payout, 0);
  const nearby = list.length;

  /** Open bounties that have real coordinates, shown on the compact live map. */
  const pins = useMemo<LiveBountyPin[]>(
    () =>
      list.map(({ request, payout }) => {
        const spot = requestMapPosition(request);
        return {
          id: request.dbId ?? request.id,
          title: request.title,
          credits: payout,
          lat: spot.lat,
          lng: spot.lng,
        };
      }),
    [list],
  );

  const stat = "rounded-2xl border border-border bg-surface p-3";

  return (
    <div className="app-shell pb-32 pt-safe">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground"><span className="text-signal">Hunter</span> dashboard</h1>
        <button
          type="button"
          onClick={close}
          aria-label="Close Hunter dashboard"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold text-signal">
        Open bounties you can claim right now, ranked for the fastest payout.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-2 min-[360px]:grid-cols-3">
        <div className={stat}>
          <CoinsIcon className="size-4 text-signal" aria-hidden />
          <p className="mt-1 font-display text-xl tabular-nums text-foreground">
            {Math.round(potential).toLocaleString()}
          </p>
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
          <p className="mt-1 font-display text-xl text-foreground">{position ? nearby : "-"}</p>
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

      <div className="mt-5 space-y-4">
        <HunterEarningBanner />

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {list.map(({ request, payout, left, miles }) => (
              <div key={request.id} className="min-w-0">
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-1 pb-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.1em]">
                <span className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="tabular-nums text-signal">Earn {formatCredits(payout)}</span>
                  <UrgencyBadge minutesLeft={left} bounty={payout} compact />
                </span>
                <span className="flex shrink-0 flex-col items-end gap-1 text-muted-foreground sm:flex-row sm:gap-2">
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
              <BountyDetailsDialog request={request} onClaim={claim} userPosition={position}>
                <RequestCard
                  request={request}
                  compact
                  distanceLabel={miles !== null ? formatDistance(miles) : undefined}
                  distanceMiles={miles}
                />
              </BountyDetailsDialog>
            </div>
          ))}
          {list.length === 0 && (
            <div className="space-y-4 md:col-span-2 xl:col-span-3">
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                No open bounties right now. Keep an eye on the live map.
              </p>
              <LiveBountyMapBox pins={pins} center={position} />
            </div>
          )}
          {list.length > 0 && nearby === 0 && position && (
            <div className="space-y-4 md:col-span-2 xl:col-span-3">
              <LiveBountyMapBox
                pins={pins}
                center={position}
                label="Live bounties on the map"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
