// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useMemo } from "react";
import { ChevronDown, CircleDollarSign, Clock, Eye, Flame, Map, MapPin, Radio, Siren, Sparkles } from "lucide-react";
import type { LiveRequest } from "@/lib/onlooker";
import { requestCategoryArt } from "@/lib/category-art";
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

/**
 * Showcase prompts used when nothing is active nearby. These are clearly framed as
 * invitations (not fake listings) so the dashboard still feels alive and clickable.
 */
const SHOWCASE: Array<{ key: string; category: string; kind: "live" | "bounty"; label: string; title: string; place: string; credits: number }> = [
  { key: "sc-street", category: "street", kind: "live", label: "Be first live", title: "Go live from the busiest block in your city", place: "Your neighborhood", credits: 40 },
  { key: "sc-food", category: "food", kind: "bounty", label: "Open a bounty", title: "Ask for the line at tonight's hot spot", place: "Nearby restaurants", credits: 60 },
  { key: "sc-events", category: "events", kind: "live", label: "Be first live", title: "Stream the crowd before the show starts", place: "Local venues", credits: 80 },
  { key: "sc-vehicles", category: "vehicles", kind: "bounty", label: "Open a bounty", title: "Pay for a quick look at traffic ahead", place: "Main routes", credits: 100 },
];

function ShowcaseCard({
  item,
  onGoLive,
  onPostBounty,
}: {
  item: (typeof SHOWCASE)[number];
  onGoLive: () => void;
  onPostBounty: () => void;
}) {
  const live = item.kind === "live";
  return (
    <button
      type="button"
      onClick={live ? onGoLive : onPostBounty}
      className="group relative flex w-[13.5rem] shrink-0 snap-start gap-2.5 overflow-hidden rounded-2xl border border-signal/30 bg-home-glass-strong p-2.5 text-left shadow-[0_10px_30px_color-mix(in_oklab,var(--color-background)_60%,transparent)] backdrop-blur-2xl transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transform-none lg:w-auto"
    >
      <span className="relative grid size-[3.25rem] shrink-0 place-items-center overflow-hidden rounded-xl border border-signal/35">
        <img src={requestCategoryArt(item.category)} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <span className="flex items-center justify-between gap-1">
          <span className={`flex items-center gap-1 text-[0.55rem] font-extrabold uppercase ${live ? "text-live" : "text-signal"}`}>
            {live ? <Radio className="size-3 animate-pulse motion-reduce:animate-none" /> : <Sparkles className="size-3" />}
            {item.label}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-signal bg-signal/15 px-1.5 py-[1px] font-mono text-[0.55rem] font-bold tabular-nums text-signal shadow-[0_0_12px_color-mix(in_oklab,var(--color-signal)_35%,transparent)]">
            <CircleDollarSign className="size-2.5" aria-hidden /> {item.credits}+
          </span>
        </span>
        <span className="line-clamp-2 text-[0.72rem] font-bold leading-tight text-foreground group-hover:text-signal">{item.title}</span>
        <span className="flex items-center gap-1 truncate text-[0.55rem] font-medium text-signal"><MapPin className="size-3 shrink-0" aria-hidden /> <span className="truncate">{item.place}</span></span>
      </span>
    </button>
  );
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
  const discoveryItems = useMemo(
    () =>
      [...activeRequests]
        .sort((a, b) => {
          const aLive = isLiveRequest(a) ? 1 : 0;
          const bLive = isLiveRequest(b) ? 1 : 0;
          if (aLive !== bLive) return bLive - aLive;
          return poolOf(b) - poolOf(a);
        })
        .slice(0, 8),
    [activeRequests, poolOf],
  );

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

  const feedColumns: Array<{
    key: LiveFeedKey;
    label: string;
    icon: typeof Siren;
    tone: string;
    borderTone: string;
    items: LiveRequest[];
    onActivate: (request: LiveRequest) => void;
    detail: (request: LiveRequest) => string;
    actionLabel: string;
    emptyTitle: string;
    emptyHint: string;
    emptyAction: () => void;
    emptyCta: string;
  }> = [
    {
      key: "emergency",
      label: "Live emergency",
      icon: Siren,
      tone: "text-crisis",
      borderTone: "border-crisis/40",
      items: feedItems.emergency,
      onActivate: onOpenEmergency,
      detail: (request) => request.place,
      actionLabel: "View",
      emptyTitle: "No active alerts nearby",
      emptyHint: "Trusted alerts appear here first",
      emptyAction: onGoLive,
      emptyCta: "Go live",
    },
    {
      key: "stream",
      label: "Active streams",
      icon: Radio,
      tone: "text-live",
      borderTone: "border-live/40",
      items: feedItems.stream,
      onActivate: onOpenLive,
      detail: (request) => `${request.watchers} watching`,
      actionLabel: "Watch",
      emptyTitle: "No live streams yet",
      emptyHint: "Be the first pair of eyes",
      emptyAction: onGoLive,
      emptyCta: "Go live",
    },
    {
      key: "bounty",
      label: "High bounties",
      icon: CircleDollarSign,
      tone: "text-signal",
      borderTone: "border-signal/40",
      items: feedItems.bounty,
      onActivate: onOpenHighBounty,
      detail: (request) => `${poolOf(request)} cr`,
      actionLabel: "Hunt",
      emptyTitle: "No open bounties",
      emptyHint: "Post one and hunters respond",
      emptyAction: onPostBounty,
      emptyCta: "Post bounty",
    },
    {
      key: "dispatches",
      label: "Recent dispatches",
      icon: Clock,
      tone: "text-signal",
      borderTone: "border-home-line",
      items: feedItems.dispatches,
      onActivate: onOpenDispatches,
      detail: (request) => (request.minutesAgo < 1 ? "just now" : `${request.minutesAgo}m ago`),
      actionLabel: "View",
      emptyTitle: "Nothing dispatched yet",
      emptyHint: "Fresh requests land here",
      emptyAction: onPostBounty,
      emptyCta: "Post bounty",
    },
    {
      key: "hotspot",
      label: "Hot spot near you",
      icon: Flame,
      tone: "text-signal",
      borderTone: "border-home-line",
      items: feedItems.hotspot,
      onActivate: onOpenHotSpot,
      detail: (request) => request.place,
      actionLabel: "View",
      emptyTitle: "No hot spot pinned yet",
      emptyHint: "Activity near you shows here",
      emptyAction: onGoLive,
      emptyCta: "Go live",
    },
  ];

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
    <section className="scrollbar-thin pointer-events-auto absolute inset-x-3 bottom-[6.75rem] top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 mx-auto overflow-y-auto overscroll-contain pb-1 sm:w-[min(68rem,calc(100vw-8rem))] lg:bottom-[7.5rem] lg:w-[min(78rem,calc(100vw-5rem))]" aria-labelledby="home-live-stage-title">
      {/* Financial-ticker readout: crisp, tabular, edge-to-edge over the map. */}
      <div
        className="mb-2 flex items-center gap-3 overflow-hidden rounded-full border border-signal/30 bg-home-glass-strong px-3 py-1.5 shadow-[0_0_24px_color-mix(in_oklab,var(--color-signal)_12%,transparent)] backdrop-blur-2xl"
        aria-label="Live city readout"
      >
        <span className="relative flex size-2 shrink-0" aria-hidden>
          <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal motion-reduce:animate-none" />
          <span className="relative size-2 rounded-full bg-signal" />
        </span>
        <div className="scrollbar-thin flex min-w-0 flex-1 items-center justify-center gap-3 overflow-x-auto whitespace-nowrap font-mono text-[0.6rem] font-bold uppercase tracking-[0.18em] tabular-nums text-foreground/70 sm:text-[0.66rem]">
          <span>LIVE <span className="text-signal">{String(liveCount).padStart(2, "0")}</span></span>
          <span className="text-border">|</span>
          <span>ALERTS <span className="text-crisis">{String(emergencyCount).padStart(2, "0")}</span></span>
          <span className="text-border">|</span>
          <span>BOUNTIES <span className="text-signal">{String(activeRequests.length).padStart(2, "0")}</span></span>
          <span className="text-border">|</span>
          <span>
            TOP POOL{" "}
            <span className="text-signal">{highestBounty ? `${poolOf(highestBounty)} CR` : "--"}</span>
          </span>
        </div>
      </div>
      <div className="mx-auto w-full overflow-hidden rounded-3xl border border-home-line bg-home-obsidian shadow-[0_32px_90px_-18px_color-mix(in_oklab,var(--color-background)_95%,transparent),0_0_0_1px_color-mix(in_oklab,var(--color-foreground)_6%,transparent),0_0_48px_color-mix(in_oklab,var(--color-signal)_9%,transparent)] backdrop-blur-2xl">
      <div className="grid min-h-[10rem] grid-cols-1 [@media(max-height:520px)]:min-h-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(15rem,0.75fr)]">
        <div className="relative flex min-w-0 flex-col justify-center overflow-hidden px-6 pb-8 pt-7 sm:px-10 sm:pb-10 sm:pt-9 [@media(max-height:520px)]:px-5 [@media(max-height:520px)]:pb-3 [@media(max-height:520px)]:pt-3">
          <div className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-home-accent/65 to-transparent sm:left-10 sm:right-10 [@media(max-height:520px)]:left-5 [@media(max-height:520px)]:right-5" aria-hidden />
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
            className="mt-2 text-center text-[clamp(1.2rem,4.2vw,2.1rem)] font-semibold leading-[1.05] text-signal drop-shadow-[0_0_16px_color-mix(in_oklab,var(--color-signal)_24%,transparent)] [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-[1.05rem]"
          >
            See what&apos;s happening. Right now.
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-center text-[0.75rem] font-normal leading-relaxed text-foreground/65 sm:text-sm [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-[0.72rem]">
            Watch live streams, follow trusted alerts, or post local bounties.
          </p>

          <div className="mt-3 flex flex-wrap justify-center gap-2.5 [@media(max-height:520px)]:mt-2">
            <Button type="button" onClick={onGoLive} className="h-11 rounded-xl border border-signal bg-signal px-4 font-bold uppercase text-signal-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--color-signal)_30%,transparent)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 sm:px-6 [@media(max-height:520px)]:h-9">
              <Radio className="size-4" /> Go live
            </Button>
            <Button type="button" onClick={onPostBounty} className="h-11 rounded-xl border border-signal bg-signal px-4 font-bold uppercase text-signal-foreground shadow-[0_0_24px_color-mix(in_oklab,var(--color-signal)_30%,transparent)] transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 sm:px-6 [@media(max-height:520px)]:h-9">
              <CircleDollarSign className="size-4" /> Post bounty
            </Button>
          </div>
        </div>

        <div className="hidden flex-col justify-center border-l border-home-line bg-home-glass p-5 sm:p-6 lg:block">
          <p className="home-display text-[0.62rem] font-semibold uppercase text-foreground/45">Live feed preview</p>
          {featured ? (
            <button type="button" onClick={() => onOpenRequest(featured)} className="group mt-2 flex h-[calc(100%-1.4rem)] w-full flex-col justify-between rounded-xl border border-home-line bg-home-glass p-3 text-left shadow-lg transition-[transform,border-color,background-color] duration-150 hover:-translate-y-0.5 hover:border-home-accent/50 hover:bg-home-accent/8 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-home-accent">
              <span className="relative -mx-1 -mt-1 mb-2 block h-20 overflow-hidden rounded-lg border border-home-line">
                <img src={requestCategoryArt(featured.category)} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/10 to-transparent" aria-hidden />
              </span>
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
            <button type="button" onClick={onGoLive} className="group mt-2 flex h-[calc(100%-1.4rem)] w-full flex-col justify-between overflow-hidden rounded-xl border border-signal/35 bg-home-glass p-3 text-left shadow-lg transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal">
              <span className="relative -mx-1 -mt-1 mb-2 block h-20 overflow-hidden rounded-lg border border-home-line">
                <img src={requestCategoryArt("street")} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
                <span className="absolute inset-0 bg-gradient-to-t from-background/75 via-background/10 to-transparent" aria-hidden />
              </span>
              <span className="flex items-center gap-1.5 text-[0.65rem] font-extrabold uppercase text-live">
                <Radio className="size-3.5 animate-pulse motion-reduce:animate-none" /> Be first live here
              </span>
              <span>
                <span className="line-clamp-2 block text-sm font-extrabold text-foreground">Your city is quiet right now</span>
                <span className="mt-1 block text-[0.68rem] font-semibold text-signal">Start a live view and watchers come to you</span>
              </span>
              <span className="flex items-center gap-1 text-[0.68rem] font-bold uppercase text-foreground/75 group-hover:text-signal"><Eye className="size-3.5" /> Go live</span>
            </button>
          )}
        </div>
      </div>

      </div>

      <div className="mt-2 overflow-hidden rounded-3xl border border-signal/25 bg-home-glass py-2.5 shadow-[0_24px_70px_color-mix(in_oklab,var(--color-background)_68%,transparent)] backdrop-blur-2xl">
        <div className="mb-2 flex items-center justify-between px-3">
          <div className="flex items-center gap-2">
            <span className="relative flex size-2" aria-hidden>
              <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal motion-reduce:animate-none" />
              <span className="relative size-2 rounded-full bg-signal" />
            </span>
            <h3 className="home-display text-[0.68rem] font-bold uppercase text-foreground">Watch now & high bounties</h3>
          </div>
          <span className="text-[0.58rem] font-bold uppercase text-signal">Live city feed</span>
        </div>
        {discoveryItems.length > 0 ? (
          <div className="scrollbar-thin flex snap-x gap-2.5 overflow-x-auto overscroll-x-contain px-3 pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible" aria-label="Active live streams and high-value bounties">
            {discoveryItems.map((request) => {
              const live = isLiveRequest(request);
              const initials = (request.requester || "?")
                .replace(/[^a-zA-Z0-9]+/g, " ")
                .trim()
                .split(" ")
                .map((part) => part.charAt(0).toUpperCase())
                .slice(0, 2)
                .join("");
              return (
                <button
                  key={`discover-${request.id}`}
                  type="button"
                  onClick={() => live ? onOpenLive(request) : onOpenRequest(request)}
                  className="group relative flex w-[13.5rem] shrink-0 snap-start gap-2.5 overflow-hidden rounded-2xl border border-signal/30 bg-home-glass-strong p-2.5 text-left shadow-[0_10px_30px_color-mix(in_oklab,var(--color-background)_60%,transparent)] backdrop-blur-2xl transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transform-none lg:w-auto"
                >
                  {/* Visual preview: category cover art with creator initials badge. */}
                  <span className="relative grid size-[3.25rem] shrink-0 place-items-center overflow-hidden rounded-xl border border-signal/35">
                    <img src={requestCategoryArt(request.category)} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
                    <span className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" aria-hidden />
                    <span className="absolute left-1 top-1 rounded-md border border-signal/50 bg-background/75 px-1 py-px font-mono text-[0.55rem] font-bold tracking-tight text-signal backdrop-blur-sm">{initials}</span>
                    {live && (
                      <span className="absolute bottom-0 inset-x-0 flex items-center justify-center gap-0.5 bg-live/85 py-[1px] text-[0.45rem] font-extrabold uppercase tracking-widest text-background">
                        <span className="size-1 animate-pulse rounded-full bg-background motion-reduce:animate-none" aria-hidden /> live
                      </span>
                    )}
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                    <span className="flex items-center justify-between gap-1">
                      <span className={`flex items-center gap-1 text-[0.55rem] font-extrabold uppercase ${live ? "text-live" : "text-signal"}`}>
                        {live ? <Radio className="size-3 animate-pulse motion-reduce:animate-none" /> : <Eye className="size-3" />}
                        {live ? `${request.watchers} watching` : `${request.minutesAgo}m ago`}
                      </span>
                      <span className="relative inline-flex shrink-0 items-center gap-0.5 rounded-full border border-signal bg-signal/15 px-1.5 py-[1px] font-mono text-[0.55rem] font-bold tabular-nums text-signal shadow-[0_0_12px_color-mix(in_oklab,var(--color-signal)_35%,transparent)] animate-pulse motion-reduce:animate-none">
                        <CircleDollarSign className="size-2.5" aria-hidden /> {poolOf(request)}
                      </span>
                    </span>
                    <span className="line-clamp-2 text-[0.72rem] font-bold leading-tight text-foreground group-hover:text-signal">{request.title}</span>
                    <span className="flex items-center gap-1 truncate text-[0.55rem] font-medium text-foreground/60"><MapPin className="size-3 shrink-0 text-signal" aria-hidden /> <span className="truncate">{request.place}</span></span>
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className="scrollbar-thin flex snap-x gap-2.5 overflow-x-auto overscroll-x-contain px-3 pb-1 lg:grid lg:grid-cols-4 lg:overflow-visible" aria-label="Ways to start the first stream or bounty nearby">
            {SHOWCASE.map((item) => (
              <ShowcaseCard key={item.key} item={item} onGoLive={onGoLive} onPostBounty={onPostBounty} />
            ))}
          </div>
        )}
      </div>

      {/* Section separator: clear hierarchy between the cards and the live dashboard. */}
      <div className="mt-4 mb-2.5 flex items-center gap-3 px-1">
        <span className="h-px flex-1 bg-gradient-to-r from-transparent via-signal/35 to-signal/35" aria-hidden />
        <span className="home-display text-[0.56rem] font-bold uppercase tracking-[0.24em] text-foreground/50">Live dashboard</span>
        <span className="h-px flex-1 bg-gradient-to-l from-transparent via-signal/35 to-signal/35" aria-hidden />
      </div>

      {/* Multi-column live dashboard: every feed visible at once, no dropdowns. */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" aria-label="Live feeds dashboard">
        {feedColumns.map((column) => {
          const Icon = column.icon;
          const visibleItems = column.items.slice(0, 4);
          return (
            <section
              key={column.key}
              aria-label={column.label}
              className={`flex min-w-0 flex-col overflow-hidden rounded-2xl border ${column.borderTone} bg-home-glass-strong shadow-[0_18px_50px_color-mix(in_oklab,var(--color-background)_65%,transparent)] backdrop-blur-2xl`}
            >
              <header className="flex items-center justify-between gap-2 border-b border-home-line px-3 py-2">
                <span className={`flex min-w-0 items-center gap-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] ${column.tone}`}>
                  <Icon className="size-3.5 shrink-0" aria-hidden />
                  <span className="truncate">{column.label}</span>
                </span>
                <span className="shrink-0 rounded-full border border-signal/50 bg-signal/10 px-1.5 py-px font-mono text-[0.55rem] font-bold tabular-nums text-signal">
                  {column.items.length}
                </span>
              </header>

              {visibleItems.length > 0 ? (
                <ul className="flex min-h-0 flex-1 flex-col gap-1.5 p-2">
                  {visibleItems.map((request) => (
                    <li key={`${column.key}-${request.id}`}>
                      <button
                        type="button"
                        onClick={() => column.onActivate(request)}
                        className="group flex w-full min-w-0 items-center gap-2 rounded-xl border border-home-line bg-home-glass p-2 text-left transition-[border-color,transform] duration-150 hover:-translate-y-0.5 hover:border-signal/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transform-none"
                      >
                        <span className="relative block size-9 shrink-0 overflow-hidden rounded-lg border border-signal/30">
                          <img src={requestCategoryArt(request.category)} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[0.72rem] font-extrabold text-foreground group-hover:text-signal">{request.title}</span>
                          <span className="mt-0.5 flex min-w-0 items-center gap-1 text-[0.6rem] font-bold text-muted-foreground">
                            <MapPin className="size-2.5 shrink-0 text-home-accent" aria-hidden />
                            <span className="truncate">{column.detail(request)}</span>
                          </span>
                        </span>
                        <span className={`shrink-0 text-[0.55rem] font-extrabold uppercase ${column.tone}`}>{column.actionLabel}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-1.5 p-3 text-center">
                  <p className="text-[0.68rem] font-extrabold text-foreground">{column.emptyTitle}</p>
                  <p className="text-[0.58rem] font-semibold text-foreground/55">{column.emptyHint}</p>
                  <Button type="button" size="sm" onClick={column.emptyAction} className="mt-1 h-7 rounded-lg px-2.5 text-[0.58rem] font-extrabold uppercase">
                    {column.emptyCta}
                  </Button>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </section>
  );
}
