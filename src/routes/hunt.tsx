// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link, useCanGoBack, useRouter } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Bell, Camera, ChevronDown, Clock, CoinsIcon, Navigation, Radio, X } from "lucide-react";
import { EarnAccordionRow } from "@/components/EarnAccordionRow";
import { AuthMapBackdrop } from "@/components/AuthMapBackdrop";
import { useAuth } from "@/hooks/use-auth";
import { creditsToUsdValue, fetchMyEarnings, usd, type EarningsSummary } from "@/lib/earnings";
import { WalletSnapshot } from "@/components/WalletSnapshot";
import { MyEarningsCard } from "@/components/MyEarningsCard";
import { WeeklyTopOnlookers } from "@/components/WeeklyTopOnlookers";
import { Leaderboard } from "@/components/Leaderboard";
import { MyBountyVideos } from "@/components/MyBountyVideos";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { BountyVideoDialog } from "@/components/BountyVideoDialog";
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
      { title: "Hunt Dashboard, Earn on Onlooker" },
      {
        name: "description",
        content:
          "See every open bounty near you with the payout, the time left and how far you have to walk.",
      },
      { property: "og:title", content: "Hunt Dashboard, Earn on Onlooker" },
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
  const [menu, setMenu] = useState<"distance" | "sort" | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  useEffect(() => {
    if (!user) return;
    let alive = true;
    const load = () =>
      void fetchMyEarnings()
        .then((next) => alive && setEarnings(next))
        .catch(() => {});
    load();
    window.addEventListener("onlooker:credits-refresh", load);
    return () => {
      alive = false;
      window.removeEventListener("onlooker:credits-refresh", load);
    };
  }, [user]);
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

  /** Bounties this hunter claimed and still has to film and submit. */
  const activeJobs = useMemo(
    () =>
      requests
        .filter((r) => r.claimedByMe && r.status === "claimed")
        .map((r) => ({
          request: r,
          payout: r.bounty + boostOf(r.id),
          left: minutesLeft(r.expiresAt, r.expiresInMin),
        })),
    [requests, boostOf],
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

  /**
   * How many open bounties sit within widening rings around the hunter, so an
   * empty or thin list still shows a clear path forward instead of a dead end.
   */
  const rings = useMemo(() => {
    if (!position) return null;
    const withMiles = open
      .map((r) => distanceMiles(position, requestMapPosition(r)))
      .filter((m) => Number.isFinite(m));
    return [5, 25, 100, 500].map((miles) => ({
      miles,
      count: withMiles.filter((m) => m <= miles).length,
    }));
  }, [open, position]);

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
  const chip =
    "inline-flex min-h-9 w-full items-center justify-between gap-2 rounded-full border px-3 text-[0.7rem] font-extrabold uppercase tracking-[0.08em] transition-colors";
  const sortLabel = SORTS.find((s) => s.key === sort)?.label ?? "Closest";

  return (
    <div className="app-shell pb-32 pt-safe">
      <div className="flex items-start justify-between gap-3">
        <h1 className="font-display text-3xl tracking-tight text-foreground"><span className="text-signal">Hunt</span> dashboard</h1>
        <button
          type="button"
          onClick={close}
          aria-label="Close hunt dashboard"
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-5" aria-hidden />
        </button>
      </div>
      <p className="mt-1 text-sm font-semibold text-signal">
        Open bounties you can claim right now, ranked for the fastest payout.
      </p>

      <WalletSnapshot />

      {/* Jobs this hunter already claimed come first: without them a claim has
          no visible route to the submission step. */}
      {activeJobs.length > 0 && (
        <section className="mt-4 rounded-2xl border border-signal/40 bg-signal/5 p-3">
          <h2 className="text-[0.66rem] font-extrabold uppercase tracking-[0.12em] text-signal">
            Active jobs you claimed
          </h2>
          <ul className="mt-2 space-y-2">
            {activeJobs.map(({ request, payout, left }) => (
              <li
                key={request.id}
                className="rounded-xl border border-border bg-surface p-3"
              >
                <p className="font-semibold text-foreground">{request.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{request.place}</p>
                <div className="mt-1 flex items-center gap-3 text-[0.68rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
                  <span className="text-signal">{formatCredits(payout)} credits</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="size-3" aria-hidden /> {left} min left
                  </span>
                </div>
                <BountyVideoDialog request={request}>
                  <button
                    type="button"
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-signal px-4 py-2.5 text-xs font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
                  >
                    <Camera className="size-4" aria-hidden /> Submit your capture
                  </button>
                </BountyVideoDialog>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Distance + sort: two dropdown chips, only one open at a time. */}
      <div className="relative mt-3 grid grid-cols-2 gap-2">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((m) => (m === "distance" ? null : "distance"))}
            aria-expanded={menu === "distance"}
            aria-label="Hunting distance"
            className={chip + " border-border bg-surface text-foreground"}
          >
            <span className="truncate">📍 {radiusText}</span>
            <ChevronDown className={"size-3.5 shrink-0 transition-transform " + (menu === "distance" ? "rotate-180" : "")} aria-hidden />
          </button>
          {menu === "distance" && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-lg">
              {[null, ...RADIUS_PRESETS_MI].map((miles) => {
                const active = radiusMiles === miles;
                return (
                  <li key={miles ?? "any"}>
                    <button
                      type="button"
                      onClick={() => {
                        setRadiusMiles(miles);
                        setMenu(null);
                      }}
                      className={"w-full px-3 py-2 text-left text-xs font-bold " + (active ? "text-signal" : "text-foreground hover:bg-secondary")}
                    >
                      {miles === null ? "Anywhere" : `${Math.round(toDisplay(miles))} ${unit}`}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenu((m) => (m === "sort" ? null : "sort"))}
            aria-expanded={menu === "sort"}
            aria-label="Sort bounties"
            className={chip + " border-border bg-surface text-foreground"}
          >
            <span className="truncate">↕ {sortLabel}</span>
            <ChevronDown className={"size-3.5 shrink-0 transition-transform " + (menu === "sort" ? "rotate-180" : "")} aria-hidden />
          </button>
          {menu === "sort" && (
            <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-border bg-surface-raised py-1 shadow-lg">
              {SORTS.map((s) => (
                <li key={s.key}>
                  <button
                    type="button"
                    onClick={() => {
                      setSort(s.key);
                      setMenu(null);
                    }}
                    className={"w-full px-3 py-2 text-left text-xs font-bold " + (sort === s.key ? "text-signal" : "text-foreground hover:bg-secondary")}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          )}
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

      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
          <div className="rounded-2xl border border-dashed border-border p-4 text-center md:col-span-2 xl:col-span-3">
            <p className="text-sm text-muted-foreground">
              {radiusMiles === null
                ? "No open bounties anywhere right now."
                : `Nothing to claim within ${radiusText.toLowerCase()} right now.`}
            </p>
            {rings && (
              <p className="mt-1.5 text-xs font-semibold text-foreground">
                {rings.map((ring, i) => (
                  <span key={ring.miles}>
                    {i > 0 && <span className="text-muted-foreground"> · </span>}
                    <span className="tabular-nums">
                      {ring.count} within {Math.round(toDisplay(ring.miles))} {unit}
                    </span>
                  </span>
                ))}
              </p>
            )}
            <Link
              to="/profile"
              className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-full border border-signal bg-surface px-4 text-[0.68rem] font-bold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/10"
            >
              <Bell className="size-4" aria-hidden />
              Notify me when bounties post nearby
            </Link>
          </div>
        )}
      </div>

      {/* Live map: a single row until tapped. */}
      <section className="mt-3 overflow-hidden rounded-2xl border border-border bg-surface">
        <button
          type="button"
          onClick={() => setMapOpen((v) => !v)}
          aria-expanded={mapOpen}
          className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3 text-left"
        >
          <span className="truncate text-sm font-bold text-foreground">
            📍 Live bounty map <span className="text-muted-foreground">· {pins.length} nearby</span>
          </span>
          <ChevronDown className={"size-4 shrink-0 text-muted-foreground transition-transform duration-200 " + (mapOpen ? "rotate-180" : "")} aria-hidden />
        </button>
        {mapOpen && (
          <div className="px-2 pb-2">
            <LiveBountyMapBox pins={pins} center={position} heightClass="h-[130px]" hideHeader />
            <Link to="/" className="mt-1.5 block text-right text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-signal">
              Full map
            </Link>
          </div>
        )}
      </section>

      <div className="mt-3 grid grid-cols-3 gap-2">
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
          <p className="truncate text-[0.62rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
            {radiusMiles === null ? "Anywhere" : `Within ${radiusText}`}
          </p>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {user && (
          <EarnAccordionRow
            title="My Earnings"
            summary={
              earnings
                ? `${earnings.netCredits} cr · ${usd(creditsToUsdValue(earnings.netCredits))}`
                : undefined
            }
          >
            <MyEarningsCard />
          </EarnAccordionRow>
        )}
        <EarnAccordionRow title="🔥 Top onlookers this week" summary="This week's leaders">
          <WeeklyTopOnlookers />
        </EarnAccordionRow>
        <EarnAccordionRow title="🏆 Top reporters" summary="Top 5">
          <Leaderboard limit={5} moreLink />
        </EarnAccordionRow>
        <EarnAccordionRow title="⚡ How hunting works" summary="Claim · Capture · Cash out">
          <HunterEarningBanner />
        </EarnAccordionRow>
      </div>

      <MyBountyVideos />

      <AuthMapBackdrop interactive />
    </div>
  );
}
