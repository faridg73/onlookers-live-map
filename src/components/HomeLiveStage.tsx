// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { CircleDollarSign, Eye, Flame, MapPin, Radio, Siren, Sparkles } from "lucide-react";
import type { LiveRequest } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";

type HomeLiveStageProps = {
  requests: LiveRequest[];
  poolOf: (request: LiveRequest) => number;
  isCrisis: (request: LiveRequest) => boolean;
  onOpenRequest: (request: LiveRequest) => void;
  onGoLive: () => void;
  onPostBounty: () => void;
};

function isLiveRequest(request: LiveRequest) {
  return request.bountyType === "live_stream" && request.status === "claimed";
}

export function HomeLiveStage({
  requests,
  poolOf,
  isCrisis,
  onOpenRequest,
  onGoLive,
  onPostBounty,
}: HomeLiveStageProps) {
  const activeRequests = requests.filter((request) => request.status === "open" || request.status === "claimed");
  const liveCount = activeRequests.filter(isLiveRequest).length;
  const emergencyCount = activeRequests.filter(isCrisis).length;
  const featured = activeRequests.find(isLiveRequest) ?? activeRequests[0] ?? null;
  const highestBounty = activeRequests.reduce<LiveRequest | null>(
    (highest, request) => (!highest || poolOf(request) > poolOf(highest) ? request : highest),
    null,
  );
  const liveRequest = activeRequests.find(isLiveRequest) ?? null;
  const emergencyRequest = activeRequests.find(isCrisis) ?? null;
  const trends = [
    { key: "bounty", label: "High Bounty Zone", icon: Flame, request: highestBounty, tone: "text-signal border-signal/55" },
    { key: "live", label: "Live Stream", icon: Radio, request: liveRequest, tone: "text-live border-live/55" },
    { key: "emergency", label: "Active Emergency Report", icon: Siren, request: emergencyRequest, tone: "text-crisis border-crisis/55" },
  ];

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

          <h2 id="home-live-stage-title" className="mt-2 max-w-xl font-display-impact text-[clamp(1.3rem,4.2vw,2.5rem)] uppercase leading-[0.98] text-foreground">
            See what&apos;s happening. <span className="text-signal">Right now.</span>
          </h2>
          <p className="mt-2 max-w-xl text-[0.78rem] font-medium leading-relaxed text-foreground/85 sm:text-sm">
            Watch real-time streams, follow trusted emergency reports, or post a local bounty for the view you need.
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

      <div className="relative flex h-11 items-center overflow-x-auto border-t border-border bg-surface/95 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Trending live ticker">
        <span className="sticky left-0 z-10 flex h-full shrink-0 items-center border-r border-signal/35 bg-surface px-3 font-display-impact text-[0.6rem] uppercase text-signal sm:text-[0.68rem]">Trending live</span>
        <div className="flex w-max min-w-full animate-live-ticker items-center gap-2 px-2 whitespace-nowrap motion-reduce:animate-none">
          {[...trends, ...trends].map((trend, index) => {
            const Icon = trend.icon;
            return (
              <Button
                key={`${trend.key}-${index}`}
                type="button"
                variant="outline"
                onClick={() => trend.request && onOpenRequest(trend.request)}
                disabled={!trend.request}
                className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border bg-background/85 px-3 text-[0.65rem] font-extrabold uppercase transition-colors enabled:hover:bg-surface-raised disabled:opacity-55 ${trend.tone}`}
              >
                <Icon className="size-3.5" aria-hidden />
                {trend.label}
                {trend.request && <span className="text-foreground">· {trend.key === "bounty" ? `${poolOf(trend.request)} cr` : trend.request.place}</span>}
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}