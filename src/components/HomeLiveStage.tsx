// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, CircleDollarSign, Clock, Eye, Flame, Map, MapPin, Radio, Siren, Sparkles } from "lucide-react";
import type { LiveRequest } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";

type LiveFeedKey = "emergency" | "bounty" | "stream" | "dispatches" | "hotspot";

type HomeLiveStageProps = {
  requests: LiveRequest[];
  poolOf: (request: LiveRequest) => number;
  isCrisis: (request: LiveRequest) => boolean;
  /** Nearest active request to the viewer, when their location is known */
  hotSpot?: LiveRequest | null;
  hotSpotRequests?: LiveRequest[];
  onOpenRequest: (request: LiveRequest) => void;
  onOpenHighBounty: (request: LiveRequest) => void;
  onOpenLive: (request: LiveRequest) => void;
  onOpenEmergency: (request: LiveRequest) => void;
  onOpenDispatches: (request: LiveRequest) => void;
  onOpenHotSpot: (request: LiveRequest) => void;
  onGoLive: () => void;
  onPostBounty: () => void;
  /** Full-map mode: swap the hero for a compact restore strip */
  mapExpanded?: boolean;
  onExitMap?: () => void;
};

function isLiveRequest(request: LiveRequest) {
  return request.bountyType === "live_stream" && request.status === "claimed";
}

export function HomeLiveStage({
  requests,
  poolOf,
  isCrisis,
  hotSpot = null,
  hotSpotRequests = [],
  onOpenRequest,
  onOpenHighBounty,
  onOpenLive,
  onOpenEmergency,
  onOpenDispatches,
  onOpenHotSpot,
  onGoLive,
  onPostBounty,
  mapExpanded = false,
  onExitMap,
}: HomeLiveStageProps) {
  const [openFeed, setOpenFeed] = useState<LiveFeedKey | null>(null);
  const activeRequests = requests.filter((request) => request.status === "open" || request.status === "claimed");
  const liveCount = activeRequests.filter(isLiveRequest).length;
  const emergencyCount = activeRequests.filter(isCrisis).length;
  const featured = activeRequests.find(isLiveRequest) ?? activeRequests[0] ?? null;
  const highestBounty = activeRequests.reduce<LiveRequest | null>(
    (highest, request) => (!highest || poolOf(request) > poolOf(highest) ? request : highest),
    null,
  );
  const liveRequest =
    activeRequests.filter(isLiveRequest).sort((a, b) => b.watchers - a.watchers)[0] ?? null;
  const emergencyRequest = activeRequests.find(isCrisis) ?? null;
  const latestRequest =
    [...activeRequests].sort((a, b) => a.minutesAgo - b.minutesAgo)[0] ?? null;

  const feedItems = useMemo<Record<LiveFeedKey, LiveRequest[]>>(() => {
    const emergencies = activeRequests
      .filter(isCrisis)
      .sort((a, b) => a.minutesAgo - b.minutesAgo);
    const bounties = activeRequests
      .filter((request) => request.bountyType !== "live_stream")
      .sort((a, b) => poolOf(b) - poolOf(a));
    const streams = activeRequests
      .filter(isLiveRequest)
      .sort((a, b) => b.watchers - a.watchers);
    const dispatches = [...activeRequests].sort((a, b) => a.minutesAgo - b.minutesAgo);

    return {
      emergency: emergencies,
      bounty: bounties,
      stream: streams,
      dispatches,
      hotspot: hotSpotRequests.filter((request) => activeRequests.some((active) => active.id === request.id)),
    };
  }, [activeRequests, hotSpotRequests, isCrisis, poolOf]);

  const trends: Array<{
    key: LiveFeedKey;
    label: string;
    icon: typeof Siren;
    request: LiveRequest | null;
    onActivate: (request: LiveRequest) => void;
    tone: string;
    detail: (request: LiveRequest) => string;
  }> = [
    {
      key: "emergency",
      label: "Live Emergency",
      icon: Siren,
      request: emergencyRequest,
      onActivate: onOpenEmergency,
      tone: "border-crisis bg-crisis text-foreground shadow-[0_0_14px_color-mix(in_oklab,var(--color-crisis)_38%,transparent)] hover:bg-crisis/90",
      detail: (request: LiveRequest) => request.place,
    },
    {
      key: "bounty",
      label: "High Bounty",
      icon: CircleDollarSign,
      request: highestBounty,
      onActivate: onOpenHighBounty,
      tone: "border-amber-300 bg-amber-300 text-black shadow-[0_0_14px_rgba(252,211,77,0.4)] hover:bg-amber-200",
      detail: (request: LiveRequest) => `${poolOf(request)} cr`,
    },
    {
      key: "stream",
      label: "Trending Stream",
      icon: Radio,
      request: liveRequest,
      onActivate: onOpenLive,
      tone: "border-live bg-live text-background shadow-[0_0_14px_color-mix(in_oklab,var(--color-live)_34%,transparent)] hover:bg-live/90",
      detail: (request: LiveRequest) => `${request.watchers} watching`,
    },
    {
      key: "dispatches",
      label: "Recent Dispatches",
      icon: Clock,
      request: latestRequest,
      onActivate: onOpenDispatches,
      tone: "border-sky-400 bg-sky-400 text-black shadow-[0_0_14px_rgba(56,189,248,0.4)] hover:bg-sky-300",
      detail: (request: LiveRequest) =>
        request.minutesAgo < 1 ? "just now" : `${request.minutesAgo}m ago`,
    },
    {
      key: "hotspot",
      label: "Hot Spot Near You",
      icon: Flame,
      request: hotSpot,
      onActivate: onOpenHotSpot,
      tone: "border-signal bg-signal text-signal-foreground shadow-[0_0_14px_color-mix(in_oklab,var(--color-signal)_38%,transparent)] hover:bg-signal/90",
      detail: (request: LiveRequest) => request.place,
    },
  ];
  const activeTrend = trends.find((trend) => trend.key === openFeed) ?? null;
  const activeItems = openFeed ? feedItems[openFeed] : [];

  const openItem = (feed: LiveFeedKey, request: LiveRequest) => {
    const trend = trends.find((candidate) => candidate.key === feed);
    trend?.onActivate(request);
  };

  if (mapExpanded) {
    return (
      <section
        className="pointer-events-auto absolute left-3 right-[7.75rem] top-[calc(env(safe-area-inset-top)+4.75rem)] z-50 flex items-center justify-between gap-3 rounded-full border border-border bg-surface/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur-xl sm:left-6 sm:right-auto sm:w-fit"
        aria-label="Full map view"
      >
        <p className="flex items-center gap-2 whitespace-nowrap font-display-impact text-[0.6rem] uppercase text-signal">
          <Map className="size-3.5" aria-hidden /> Full map
        </p>
        <span className="whitespace-nowrap text-[0.6rem] font-bold uppercase text-foreground/80">
          {liveCount} live · {emergencyCount} alerts · {activeRequests.length} bounties
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={onExitMap}
          className="h-8 shrink-0 rounded-full border-signal/50 px-3 text-[0.62rem] font-extrabold uppercase text-foreground hover:bg-signal hover:text-signal-foreground"
        >
          <ChevronDown className="size-3.5" aria-hidden /> Show feed
        </Button>
      </section>
    );
  }

  return (
    <section className="pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+4.75rem)] z-50 overflow-hidden rounded-md border border-signal/45 bg-background/92 shadow-[0_20px_60px_color-mix(in_oklab,var(--color-background)_72%,transparent)] backdrop-blur-xl sm:left-6 sm:right-auto sm:w-[min(43rem,calc(100vw-8rem))]" aria-labelledby="home-live-stage-title">
      <div className="grid min-h-[9.75rem] grid-cols-1 lg:grid-cols-[minmax(0,1.2fr)_minmax(15rem,0.8fr)]">
        <div className="relative min-w-0 overflow-hidden px-4 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4">
          <div className="absolute inset-y-0 left-0 w-1 bg-signal" aria-hidden />
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-center gap-2 font-display-impact text-[0.62rem] uppercase text-signal sm:text-xs">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inset-0 animate-ping-slow rounded-full bg-live motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-live" />
              </span>
              The city is live
            </p>
            <div className="hidden items-center gap-2 text-[0.6rem] font-bold uppercase text-muted-foreground md:flex md:text-[0.7rem]">
              <span>{liveCount} live</span>
              <span className="text-border">/</span>
              <span>{emergencyCount} alerts</span>
              <span className="text-border">/</span>
              <span>{activeRequests.length} bounties</span>
            </div>
          </div>
          <div className="mt-1 flex items-center gap-2 text-[0.58rem] font-bold uppercase text-muted-foreground md:hidden" aria-label="Current live activity">
            <span>{liveCount} live</span>
            <span className="text-border">/</span>
            <span>{emergencyCount} alerts</span>
            <span className="text-border">/</span>
            <span>{activeRequests.length} bounties</span>
          </div>

          <h2 id="home-live-stage-title" className="mt-2 max-w-xl font-display-impact text-[clamp(1.3rem,4.2vw,2.5rem)] uppercase leading-[0.98] text-foreground">
            See what&apos;s happening. <span className="text-signal">Right now.</span>
          </h2>
          <p className="mt-2 max-w-xl whitespace-nowrap text-[0.72rem] font-medium leading-relaxed text-white sm:text-sm">
            Watch live streams, follow trusted alerts, or post local bounties.
          </p>

          <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <Button type="button" onClick={onGoLive} className="h-10 rounded-md px-3 font-extrabold uppercase sm:h-11 sm:px-5">
              <Radio className="size-4" /> Go live
            </Button>
            <Button type="button" variant="outline" onClick={onPostBounty} className="h-10 rounded-md border-signal/60 bg-surface/85 px-3 font-extrabold uppercase text-foreground hover:bg-signal hover:text-signal-foreground sm:h-11 sm:px-5">
              <CircleDollarSign className="size-4 text-signal" /> Post bounty
            </Button>
          </div>
        </div>

        <div className="hidden border-l border-border bg-surface/75 p-3 lg:block">
          <p className="font-display-impact text-[0.62rem] uppercase text-muted-foreground">Live feed preview</p>
          {featured ? (
            <button type="button" onClick={() => onOpenRequest(featured)} className="group mt-2 flex h-[calc(100%-1.4rem)] w-full flex-col justify-between rounded-md border border-border bg-background/80 p-3 text-left transition-colors hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <span className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 text-[0.65rem] font-extrabold uppercase ${isCrisis(featured) ? "text-crisis" : isLiveRequest(featured) ? "text-live" : "text-signal"}`}>
                  {isCrisis(featured) ? <Siren className="size-3.5" /> : isLiveRequest(featured) ? <Radio className="size-3.5 animate-pulse motion-reduce:animate-none" /> : <Sparkles className="size-3.5" />}
                  {isCrisis(featured) ? "Emergency report" : isLiveRequest(featured) ? "Live now" : "Open bounty"}
                </span>
                <span className="text-xs font-extrabold text-signal">{poolOf(featured)} cr</span>
              </span>
              <span>
                <span className="line-clamp-2 block text-sm font-extrabold text-foreground">{featured.title}</span>
                <span className="mt-1 flex items-center gap-1 text-[0.68rem] text-muted-foreground"><MapPin className="size-3" /> {featured.place}</span>
              </span>
              <span className="flex items-center gap-1 text-[0.68rem] font-extrabold uppercase text-foreground group-hover:text-signal"><Eye className="size-3.5" /> Open on map</span>
            </button>
          ) : (
            <div className="mt-2 flex h-[calc(100%-1.4rem)] items-center rounded-md border border-dashed border-border bg-background/55 px-4 text-xs text-muted-foreground">
              No active posts nearby yet. Start the first live view or local bounty.
            </div>
          )}
        </div>
      </div>

      <div className="relative flex h-11 items-center overflow-hidden border-t border-border bg-surface/95" aria-label="Trending live ticker">
        <span className="sticky left-0 z-10 flex h-full shrink-0 items-center border-r border-signal/35 bg-surface px-3 font-display-impact text-[0.6rem] uppercase text-signal sm:text-[0.68rem]">Trending live</span>
        <div className={`flex w-max min-w-full items-center gap-2 px-2 whitespace-nowrap animate-live-ticker hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none ${openFeed ? "[animation-play-state:paused]" : ""}`}>
          {[...trends, ...trends].map((trend, index) => {
            const Icon = trend.icon;
            return (
              <Button
                key={`${trend.key}-${index}`}
                type="button"
                variant="outline"
                onClick={() => setOpenFeed((current) => current === trend.key ? null : trend.key)}
                aria-expanded={openFeed === trend.key}
                aria-controls="home-live-feed-drawer"
                aria-label={`${trend.label}: ${openFeed === trend.key ? "close" : "open"} feed`}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.65rem] font-extrabold uppercase transition-[transform,background-color] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-foreground/80 motion-reduce:transform-none ${trend.tone}`}
              >
                <Icon className="size-3.5" aria-hidden />
                {trend.label}
                {openFeed === trend.key ? <ChevronUp className="size-3" aria-hidden /> : <ChevronDown className="size-3" aria-hidden />}
              </Button>
            );
          })}
        </div>
      </div>

      <div
        id="home-live-feed-drawer"
        className={`grid border-t border-border bg-surface/98 transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:duration-0 ${openFeed ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          {activeTrend && (
            <div className="px-3 pb-3 pt-2.5 sm:px-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <activeTrend.icon className="size-4 shrink-0 text-signal" aria-hidden />
                  <h3 className="truncate font-display-impact text-xs uppercase text-foreground">{activeTrend.label}</h3>
                  <span className="rounded-full border border-border bg-background px-2 py-0.5 text-[0.62rem] font-extrabold text-foreground">
                    {activeItems.length}
                  </span>
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => setOpenFeed(null)} aria-label={`Close ${activeTrend.label}`} className="size-8 shrink-0 rounded-full text-foreground hover:text-signal">
                  <ChevronUp className="size-4" aria-hidden />
                </Button>
              </div>

              {activeItems.length > 0 ? (
                <div className="max-h-[min(20dvh,14rem)] space-y-2 overflow-y-auto overscroll-contain pr-1 sm:max-h-[min(32dvh,16rem)]" aria-label={`${activeTrend.label} active items`}>
                  {activeItems.map((request) => (
                    <div key={`${openFeed}-${request.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-md border border-border bg-background/90 p-2.5">
                      <Button type="button" variant="ghost" onClick={() => openFeed && openItem(openFeed, request)} className="h-auto min-w-0 justify-start p-0 text-left hover:bg-transparent">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold text-foreground">{request.title}</span>
                          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.7rem] font-bold text-muted-foreground">
                            <MapPin className="size-3 shrink-0 text-signal" aria-hidden />
                            <span className="truncate">{request.place}</span>
                            <span aria-hidden>·</span>
                            <span className="shrink-0">{activeTrend.detail(request)}</span>
                          </span>
                        </span>
                      </Button>
                      <Button type="button" variant={openFeed === "bounty" ? "default" : "outline"} onClick={() => openFeed && openItem(openFeed, request)} className="h-8 shrink-0 rounded-full px-3 text-[0.65rem] font-extrabold uppercase">
                        {openFeed === "bounty" && request.status === "open" ? "Hunt" : openFeed === "stream" ? "Watch" : "View"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="rounded-md border border-dashed border-signal/45 bg-background/80 p-3 text-center">
                  <p className="text-xs font-bold text-foreground">No active items right now—tap below to start one!</p>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <Button type="button" onClick={onGoLive} className="h-9 font-extrabold uppercase">
                      <Radio className="size-3.5" /> Go live
                    </Button>
                    <Button type="button" variant="outline" onClick={onPostBounty} className="h-9 border-signal/60 font-extrabold uppercase text-foreground hover:bg-signal hover:text-signal-foreground">
                      <CircleDollarSign className="size-3.5 text-signal" /> Post bounty
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
