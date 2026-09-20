// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { ChevronDown, CircleDollarSign, Clock, Eye, Flame, Map, MapPin, Radio, Siren, Sparkles } from "lucide-react";
import type { LiveRequest } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type HomeLiveStageProps = {
  requests: LiveRequest[];
  poolOf: (request: LiveRequest) => number;
  isCrisis: (request: LiveRequest) => boolean;
  /** Nearest active request to the viewer, when their location is known */
  hotSpot?: LiveRequest | null;
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
  const [emptyLabel, setEmptyLabel] = useState<string | null>(null);
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

  const trends = [
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

  if (mapExpanded) {
    return (
      <section
        className="pointer-events-auto absolute inset-x-3 top-[calc(env(safe-area-inset-top)+4.75rem)] z-50 flex items-center justify-between gap-3 rounded-full border border-border bg-surface/95 py-2 pl-4 pr-2 shadow-lg backdrop-blur-xl sm:left-6 sm:right-auto sm:w-fit"
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
        <div className="flex w-max min-w-full items-center gap-2 px-2 whitespace-nowrap animate-live-ticker hover:[animation-play-state:paused] focus-within:[animation-play-state:paused] motion-reduce:animate-none">
          {[...trends, ...trends].map((trend, index) => {
            const Icon = trend.icon;
            return (
              <Button
                key={`${trend.key}-${index}`}
                type="button"
                variant="outline"
                onClick={() => {
                  if (trend.request) trend.onActivate(trend.request);
                  else setEmptyLabel(trend.label);
                }}
                aria-label={`${trend.label}${trend.request ? `: ${trend.request.title}` : ": nothing active right now"}`}
                className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[0.65rem] font-extrabold uppercase transition-[transform,background-color] hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-foreground/80 motion-reduce:transform-none ${trend.tone}`}
              >
                <Icon className="size-3.5" aria-hidden />
                {trend.label}
                {trend.request && <span className="opacity-80">· {trend.detail(trend.request)}</span>}
              </Button>
            );
          })}
        </div>
      </div>

      <Dialog open={emptyLabel !== null} onOpenChange={(open) => !open && setEmptyLabel(null)}>
        <DialogContent className="max-w-sm border-signal/45">
          <DialogHeader>
            <DialogTitle className="font-display-impact uppercase">{emptyLabel}</DialogTitle>
            <DialogDescription className="text-white">
              No active items right now—tap below to start one!
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="grid grid-cols-2 gap-2 sm:flex">
            <Button
              type="button"
              onClick={() => {
                setEmptyLabel(null);
                onGoLive();
              }}
              className="h-11 font-extrabold uppercase"
            >
              <Radio className="size-4" /> Go live
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEmptyLabel(null);
                onPostBounty();
              }}
              className="h-11 border-signal/60 font-extrabold uppercase text-foreground hover:bg-signal hover:text-signal-foreground"
            >
              <CircleDollarSign className="size-4 text-signal" /> Post a bounty
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
