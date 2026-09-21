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
      tone: "border-crisis/35 bg-home-glass text-foreground hover:border-crisis/70",
      detail: (request: LiveRequest) => request.place,
    },
    {
      key: "bounty",
      label: "High Bounty",
      icon: CircleDollarSign,
      request: highestBounty,
      onActivate: onOpenHighBounty,
      tone: "border-signal/45 bg-home-glass text-foreground hover:border-signal",
      detail: (request: LiveRequest) => `${poolOf(request)} cr`,
    },
    {
      key: "stream",
      label: "Trending Stream",
      icon: Radio,
      request: liveRequest,
      onActivate: onOpenLive,
      tone: "border-live/35 bg-home-glass text-foreground hover:border-live/70",
      detail: (request: LiveRequest) => `${request.watchers} watching`,
    },
    {
      key: "dispatches",
      label: "Recent Dispatches",
      icon: Clock,
      request: latestRequest,
      onActivate: onOpenDispatches,
      tone: "border-signal/45 bg-home-glass text-foreground hover:border-signal",
      detail: (request: LiveRequest) =>
        request.minutesAgo < 1 ? "just now" : `${request.minutesAgo}m ago`,
    },
    {
      key: "hotspot",
      label: "Hot Spot Near You",
      icon: Flame,
      request: hotSpot,
      onActivate: onOpenHotSpot,
      tone: "border-signal/60 bg-signal/10 text-signal hover:border-signal",
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
        className="pointer-events-auto absolute left-3 right-[7.75rem] top-[calc(env(safe-area-inset-top)+4.75rem)] z-50 flex items-center justify-between gap-3 rounded-xl border border-home-line bg-home-glass-strong py-2 pl-4 pr-2 shadow-2xl backdrop-blur-2xl sm:left-6 sm:right-auto sm:w-fit"
        aria-label="Full map view"
      >
        <p className="home-display flex items-center gap-2 whitespace-nowrap text-[0.6rem] font-semibold uppercase text-home-accent">
          <Map className="size-3.5" aria-hidden /> Full map
        </p>
        <span className="whitespace-nowrap text-[0.6rem] font-bold uppercase text-foreground/80">
          {liveCount} live · {emergencyCount} alerts · {activeRequests.length} bounties
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={onExitMap}
          className="h-8 shrink-0 rounded-lg border-home-line bg-home-glass px-3 text-[0.62rem] font-bold uppercase text-foreground hover:border-home-accent/60 hover:bg-home-accent/12 hover:text-home-accent"
        >
          <ChevronDown className="size-3.5" aria-hidden /> Show feed
        </Button>
      </section>
    );
  }

  return (
    <section className="pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+5.3rem)] z-50 mx-auto sm:w-[min(68rem,calc(100vw-8rem))]" aria-labelledby="home-live-stage-title">
      <div className="overflow-hidden rounded-2xl border border-home-line bg-home-glass-strong shadow-2xl backdrop-blur-2xl">
      <div className="grid min-h-[11rem] grid-cols-1 [@media(max-height:520px)]:min-h-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.75fr)]">
        <div className="relative min-w-0 overflow-hidden px-5 pb-5 pt-5 sm:px-7 sm:pb-6 sm:pt-6 [@media(max-height:520px)]:pb-3 [@media(max-height:520px)]:pt-3">
          <div className="absolute left-5 right-5 top-0 h-px bg-gradient-to-r from-transparent via-home-accent/65 to-transparent" aria-hidden />
          <div className="flex items-center justify-center gap-3">
            <p className="home-display flex items-center gap-2 text-[0.62rem] font-semibold uppercase text-home-accent sm:text-xs">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inset-0 animate-ping-slow rounded-full bg-live motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-live" />
              </span>
              The city is live
            </p>
            <div className="hidden items-center gap-2 whitespace-nowrap text-[0.8rem] font-bold uppercase text-muted-foreground md:flex md:text-[0.9rem]">
              <span className="whitespace-nowrap">{liveCount} live</span>
              <span className="text-border">/</span>
              <span className="whitespace-nowrap">{emergencyCount} alerts</span>
              <span className="text-border">/</span>
              <span className="whitespace-nowrap">{activeRequests.length} bounties</span>
            </div>
          </div>
          <div className="mt-1 flex items-center justify-center gap-2 text-[0.78rem] font-bold uppercase text-muted-foreground md:hidden" aria-label="Current live activity">
            <span className="whitespace-nowrap">{liveCount} live</span>
            <span className="text-border">/</span>
            <span className="whitespace-nowrap">{emergencyCount} alerts</span>
            <span className="text-border">/</span>
            <span className="whitespace-nowrap">{activeRequests.length} bounties</span>
          </div>

          <h2
            id="home-live-stage-title"
            className="mt-3 text-center text-[clamp(1.2rem,4.2vw,2.1rem)] font-semibold leading-[1.05] text-signal drop-shadow-[0_0_16px_color-mix(in_oklab,var(--color-signal)_24%,transparent)] [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-[1.05rem]"
          >
            See what&apos;s happening. Right now.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-[0.75rem] font-normal leading-relaxed text-foreground/65 sm:text-sm [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-[0.72rem]">
            Watch live streams, follow trusted alerts, or post local bounties.
          </p>

          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:flex sm:flex-wrap [@media(max-height:520px)]:mt-2">
            <Button type="button" onClick={onGoLive} className="h-11 rounded-xl border border-signal bg-signal px-4 font-bold uppercase text-signal-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--color-signal)_30%,transparent)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 sm:px-6 [@media(max-height:520px)]:h-9">
              <Radio className="size-4" /> Go live
            </Button>
            <Button type="button" onClick={onPostBounty} className="h-11 rounded-xl border border-signal bg-signal px-4 font-bold uppercase text-signal-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--color-signal)_30%,transparent)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 sm:px-6 [@media(max-height:520px)]:h-9">
              <CircleDollarSign className="size-4" /> Post bounty
            </Button>
          </div>
        </div>

        <div className="hidden border-l border-home-line bg-home-glass p-4 lg:block">
          <p className="home-display text-[0.62rem] font-semibold uppercase text-foreground/45">Live feed preview</p>
          {featured ? (
            <button type="button" onClick={() => onOpenRequest(featured)} className="group mt-2 flex h-[calc(100%-1.4rem)] w-full flex-col justify-between rounded-xl border border-home-line bg-home-glass p-3 text-left shadow-lg transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-home-accent/50 hover:bg-home-accent/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-accent">
              <span className="flex items-center justify-between gap-2">
                <span className={`flex items-center gap-1.5 text-[0.65rem] font-extrabold uppercase ${isCrisis(featured) ? "text-crisis" : isLiveRequest(featured) ? "text-live" : "text-signal"}`}>
                  {isCrisis(featured) ? <Siren className="size-3.5" /> : isLiveRequest(featured) ? <Radio className="size-3.5 animate-pulse motion-reduce:animate-none" /> : <Sparkles className="size-3.5" />}
                  {isCrisis(featured) ? "Emergency report" : isLiveRequest(featured) ? "Live now" : "Open bounty"}
                </span>
                <span className="text-xs font-bold text-home-accent">{poolOf(featured)} cr</span>
              </span>
              <span>
                <span className="line-clamp-2 block text-sm font-extrabold text-foreground">{featured.title}</span>
                <span className="mt-1 flex items-center gap-1 text-[0.68rem] text-muted-foreground"><MapPin className="size-3" /> {featured.place}</span>
              </span>
              <span className="flex items-center gap-1 text-[0.68rem] font-bold uppercase text-foreground/75 group-hover:text-home-accent"><Eye className="size-3.5" /> Open on map</span>
            </button>
          ) : (
            <div className="mt-2 flex h-[calc(100%-1.4rem)] items-center rounded-xl border border-dashed border-home-line bg-home-glass px-4 text-xs text-foreground/55">
              No active posts nearby yet. Start the first live view or local bounty.
            </div>
          )}
        </div>
      </div>

      </div>

      <div className="relative mt-2 flex h-12 items-stretch overflow-hidden rounded-xl border border-home-line bg-home-glass-strong shadow-xl backdrop-blur-2xl" aria-label="Trending live ticker">
        <span className="home-display z-10 flex shrink-0 items-center border-r border-home-line bg-home-accent/10 px-3 text-[0.6rem] font-semibold uppercase text-home-accent sm:text-[0.68rem]">Trending live</span>
        <div
          className="scrollbar-thin flex min-w-0 flex-1 items-center gap-2 overflow-x-auto overscroll-x-contain px-2 whitespace-nowrap"
          onWheel={(event) => {
            if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
            event.currentTarget.scrollBy({ left: event.deltaY, behavior: "smooth" });
          }}
          aria-label="Browse trending live feeds"
        >
          {trends.map((trend) => {
            const Icon = trend.icon;
            return (
              <Button
                key={trend.key}
                type="button"
                variant="outline"
                onClick={() => setOpenFeed((current) => current === trend.key ? null : trend.key)}
                aria-expanded={openFeed === trend.key}
                aria-controls="home-live-feed-drawer"
                aria-label={`${trend.label}: ${openFeed === trend.key ? "close" : "open"} feed`}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.65rem] font-bold uppercase shadow-none transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-home-accent/70 aria-expanded:border-home-accent/70 aria-expanded:bg-home-accent/14 aria-expanded:text-home-accent motion-reduce:transform-none ${trend.tone}`}
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
        className={`mt-2 grid overflow-hidden rounded-xl border border-home-line bg-home-glass-strong shadow-2xl backdrop-blur-2xl transition-[grid-template-rows,opacity] duration-300 ease-out motion-reduce:duration-0 ${openFeed ? "grid-rows-[1fr] opacity-100" : "pointer-events-none grid-rows-[0fr] border-transparent opacity-0"}`}
      >
        <div className="min-h-0 overflow-hidden">
          {activeTrend && (
            <div className="px-3 pb-3 pt-2.5 sm:px-4">
              <div className="mb-2 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                   <activeTrend.icon className="size-4 shrink-0 text-home-accent" aria-hidden />
                   <h3 className="home-display truncate text-xs font-semibold uppercase text-foreground">{activeTrend.label}</h3>
                   <span className="rounded-full border border-home-line bg-home-glass px-2 py-0.5 text-[0.62rem] font-bold text-foreground">
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
                     <div key={`${openFeed}-${request.id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 rounded-xl border border-home-line bg-home-glass p-2.5 shadow-lg">
                      <Button type="button" variant="ghost" onClick={() => openFeed && openItem(openFeed, request)} className="h-auto min-w-0 justify-start p-0 text-left hover:bg-transparent">
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-extrabold text-foreground">{request.title}</span>
                          <span className="mt-1 flex min-w-0 items-center gap-1.5 text-[0.7rem] font-bold text-muted-foreground">
                             <MapPin className="size-3 shrink-0 text-home-accent" aria-hidden />
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
                    <Button type="button" variant="outline" onClick={onPostBounty} className="h-9 animate-red-flash font-extrabold uppercase text-[#FF5A4E] hover:bg-signal hover:text-signal-foreground">
                      <CircleDollarSign className="size-8 text-signal" /> Post bounty
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
