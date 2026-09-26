// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Fragment, useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { BadgeCheck, ChevronDown, CircleDollarSign, Eye, Fingerprint, Map, MapPin, Megaphone, Radar, Radio, ShieldCheck, Siren, Sparkles } from "lucide-react";
import { formatAgo, type LiveRequest } from "@/lib/onlooker";
import { useOnlooker } from "@/lib/onlooker-store";
import { BROADCAST_CATEGORY_ART, requestCategoryArt } from "@/lib/category-art";
import { BROADCAST_CATEGORIES } from "@/lib/broadcast-categories";
import { Button } from "@/components/ui/button";
import { RecentCapturesFeed } from "@/components/RecentCapturesFeed";
import step1Thumb from "@/assets/home/step1-post-bounty.jpg.asset.json";
import step2Thumb from "@/assets/home/step2-hunter-claims.jpg.asset.json";
import step3Thumb from "@/assets/home/step3-verified-results.jpg.asset.json";

type ActivityTab = "all" | "bounty" | "live" | "alert";

type HomeLiveStageProps = {
  requests: LiveRequest[];
  poolOf: (request: LiveRequest) => number;
  isCrisis: (request: LiveRequest) => boolean;
  onOpenRequest: (request: LiveRequest) => void;
  onOpenLive: (request: LiveRequest) => void;
  onOpenEmergency: (request: LiveRequest) => void;
  onGoLive: () => void;
  onPostBounty: () => void;
  /** Full-map mode: swap the hero for a compact restore strip */
  mapExpanded?: boolean;
  onExitMap?: () => void;
};

function isLiveRequest(request: LiveRequest) {
  return request.bountyType === "live_stream" && request.status === "claimed";
}

const HOW_IT_WORKS: Array<{ step: string; title: string; body: string; icon: typeof CircleDollarSign; thumb: string; thumbAlt: string }> = [
  {
    step: "01",
    title: "Post a Bounty",
    body: "Need eyes on something real-world? Post a task with a reward — check a location, verify an event, capture a moment.",
    icon: Megaphone,
    thumb: step1Thumb.url,
    thumbAlt: "A phone screen showing a bounty request being posted",
  },
  {
    step: "02",
    title: "An Onlooker Claims It",
    body: "Nearby verified Onlookers see your bounty and claim it to fulfill your request in person.",
    icon: Radar,
    thumb: step2Thumb.url,
    thumbAlt: "An Onlooker on location holding their phone",
  },
  {
    step: "03",
    title: "Get Verified Results",
    body: "Approve the proof, and payment goes out. Real tasks, real neighborhoods, real cash in your pocket.",
    icon: BadgeCheck,
    thumb: step3Thumb.url,
    thumbAlt: "A verified photo proof card with a checkmark",
  },
];

const TABS: Array<{ key: ActivityTab; label: string }> = [
  { key: "all", label: "All" },
  { key: "bounty", label: "Bounties" },
  { key: "live", label: "Live" },
  { key: "alert", label: "Alerts" },
];

/**
 * Showcase prompts used when nothing is active nearby. These are clearly framed as
 * invitations (not fake listings) so the feed still feels alive and clickable.
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
      className="group flex min-w-0 gap-2.5 overflow-hidden rounded-2xl border border-home-line bg-home-glass-strong p-2.5 text-left backdrop-blur-2xl transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transform-none"
    >
      <span className="relative grid size-[3.25rem] shrink-0 place-items-center overflow-hidden rounded-xl border border-home-line">
        <img src={requestCategoryArt(item.category)} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
        <span className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" aria-hidden />
      </span>
      <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
        <span className="flex items-center justify-between gap-1">
          <span className={`flex items-center gap-1 text-[0.55rem] font-extrabold uppercase ${live ? "text-live" : "text-muted-foreground"}`}>
            {live ? <Radio className="size-3 animate-pulse motion-reduce:animate-none" /> : <Sparkles className="size-3" />}
            {item.label}
          </span>
          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-background/70 px-1.5 py-[1px] font-mono text-[0.55rem] font-bold tabular-nums text-muted-foreground">
            <CircleDollarSign className="size-2.5" aria-hidden /> {item.credits}+
          </span>
        </span>
        <span className="line-clamp-2 text-[0.72rem] font-bold leading-tight text-foreground group-hover:text-signal">{item.title}</span>
        <span className="flex items-center gap-1 truncate text-[0.55rem] font-medium text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden /> <span className="truncate">{item.place}</span></span>
      </span>
    </button>
  );
}

export function HomeLiveStage({
  requests,
  poolOf,
  isCrisis,
  onOpenRequest,
  onOpenLive,
  onOpenEmergency,
  onGoLive,
  onPostBounty,
  mapExpanded = false,
  onExitMap,
}: HomeLiveStageProps) {
  const navigate = useNavigate();
  const [tab, setTab] = useState<ActivityTab>("all");
  const { signedIn } = useOnlooker();

  const activeRequests = requests.filter((request) => request.status === "open" || request.status === "claimed");
  const liveCount = activeRequests.filter(isLiveRequest).length;
  const emergencyCount = activeRequests.filter(isCrisis).length;
  const liveRequest = activeRequests.filter(isLiveRequest).sort((a, b) => b.watchers - a.watchers)[0] ?? null;
  const emergencyRequest = activeRequests.find(isCrisis) ?? null;
  const highestBounty = activeRequests.reduce<LiveRequest | null>(
    (highest, request) => (!highest || poolOf(request) > poolOf(highest) ? request : highest),
    null,
  );

  const kindOf = (request: LiveRequest): ActivityTab =>
    isCrisis(request) ? "alert" : isLiveRequest(request) ? "live" : "bounty";

  /**
   * Ticker stats: only show counters with real activity. LIVE and ALERTS are
   * dropped when zero; if nothing is active at all the whole bar is hidden.
   */
  const tickerItems = useMemo(() => {
    const items: Array<{ key: string; node: React.ReactNode }> = [];
    if (liveCount > 0) {
      items.push({
        key: "live",
        node: (
          <button
            type="button"
            onClick={() => (liveRequest ? onOpenLive(liveRequest) : navigate({ to: "/discover" }))}
            className="rounded-full px-1 transition-colors duration-150 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            aria-label={`${liveCount} live streams — open`}
          >
            LIVE <span className="text-signal">{String(liveCount).padStart(2, "0")}</span>
          </button>
        ),
      });
    }
    if (emergencyCount > 0) {
      items.push({
        key: "alerts",
        node: (
          <button
            type="button"
            onClick={() => (emergencyRequest ? onOpenEmergency(emergencyRequest) : navigate({ to: "/feed" }))}
            className="rounded-full px-1 transition-colors duration-150 hover:text-crisis focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            aria-label={`${emergencyCount} live alerts — open`}
          >
            ALERTS <span className="text-crisis">{String(emergencyCount).padStart(2, "0")}</span>
          </button>
        ),
      });
    }
    if (activeRequests.length > 0) {
      items.push({
        key: "bounties",
        node: (
          <button
            type="button"
            onClick={() => (highestBounty ? onOpenRequest(highestBounty) : navigate({ to: "/feed" }))}
            className="rounded-full px-1 transition-colors duration-150 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            aria-label={`${activeRequests.length} active bounties — open`}
          >
            BOUNTIES <span className="text-signal">{String(activeRequests.length).padStart(2, "0")}</span>
          </button>
        ),
      });
      items.push({
        key: "pool",
        node: (
          <button
            type="button"
            onClick={() => (highestBounty ? onOpenRequest(highestBounty) : onPostBounty())}
            className="rounded-full px-1 transition-colors duration-150 hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            aria-label={highestBounty ? `Top pool ${poolOf(highestBounty)} credits — open bounty` : "No pool yet — post a bounty"}
          >
            TOP POOL <span className="text-signal">{highestBounty ? `${poolOf(highestBounty)} CR` : "--"}</span>
          </button>
        ),
      });
    }
    return items;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [liveCount, emergencyCount, activeRequests.length, liveRequest, emergencyRequest, highestBounty, poolOf]);

  /** One list, deduplicated: alerts first, then live streams, then richest bounties. */
  const activity = useMemo(() => {
    const rank: Record<ActivityTab, number> = { alert: 0, live: 1, bounty: 2, all: 3 };
    return [...activeRequests]
      .filter((request) => tab === "all" || kindOf(request) === tab)
      .sort((a, b) => {
        const byKind = rank[kindOf(a)] - rank[kindOf(b)];
        if (byKind !== 0) return byKind;
        return poolOf(b) - poolOf(a);
      })
      .slice(0, 12);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRequests, tab, poolOf, isCrisis]);

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
    <section className="scrollbar-thin pointer-events-auto absolute inset-x-0 bottom-[calc(var(--bottom-nav-height,6.75rem)+0.5rem)] top-[calc(env(safe-area-inset-top)+0.75rem)] z-50 w-full max-w-none overflow-y-auto overscroll-contain px-3 pb-4 sm:px-4 lg:bottom-[calc(var(--bottom-nav-height,5.5rem)+1.5rem)]" aria-labelledby="home-live-stage-title">
      <div className="mx-auto flex w-full max-w-none flex-col gap-4 sm:max-w-[min(68rem,calc(100vw-8rem))] lg:max-w-[min(88rem,calc(100vw-6rem))] 2xl:max-w-[min(116rem,calc(100vw-8rem))]">

        {/* 1. Hero */}
        <div className="relative overflow-hidden rounded-3xl border border-home-line bg-home-obsidian px-4 pb-5 pt-5 shadow-[0_32px_90px_-18px_color-mix(in_oklab,var(--color-background)_95%,transparent)] backdrop-blur-2xl sm:px-10 sm:pb-6 sm:pt-6 lg:px-12 [@media(max-height:520px)]:px-5 [@media(max-height:520px)]:pb-3 [@media(max-height:520px)]:pt-3">
          <div className="absolute left-6 right-6 top-0 h-px bg-gradient-to-r from-transparent via-home-accent/65 to-transparent sm:left-10 sm:right-10 lg:left-12 lg:right-12" aria-hidden />
          <div className="pointer-events-none absolute left-1/2 top-[-4rem] h-48 w-[70%] -translate-x-1/2 rounded-full bg-signal/10 blur-3xl" aria-hidden />
          <div className="relative flex items-center justify-center gap-3">
            <p className="home-display inline-flex items-center gap-2 border border-signal/30 bg-signal/5 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.25em] text-signal sm:text-xs">
              <span className="relative flex size-1.5" aria-hidden>
                <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal motion-reduce:animate-none" />
                <span className="relative size-1.5 rounded-full bg-signal" />
              </span>
              The city is live
            </p>
          </div>

          {/* Clickable financial-ticker readout — hidden entirely when nothing is active */}
          {tickerItems.length > 0 && (
            <div
              className="mt-2 flex items-center justify-center gap-2.5 overflow-x-auto whitespace-nowrap rounded-full border border-home-line bg-home-glass-strong px-3 py-1.5 font-mono text-[0.8rem] font-bold uppercase tracking-[0.12em] tabular-nums text-foreground/70 backdrop-blur-2xl sm:gap-4 sm:text-[0.9rem] [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:py-1"
              aria-label="Live city readout"
            >
              {tickerItems.map((item, index) => (
                <Fragment key={item.key}>
                  {index > 0 && <span className="text-border" aria-hidden>|</span>}
                  {item.node}
                </Fragment>
              ))}
            </div>
          )}

          <h2
            id="home-live-stage-title"
            className="relative mt-3 text-center text-[clamp(1.2rem,4.2vw,2.4rem)] font-extrabold italic uppercase leading-[0.95] tracking-tighter text-signal drop-shadow-[0_0_22px_color-mix(in_oklab,var(--color-signal)_35%,transparent)] [@media(max-height:520px)]:mt-1 [@media(max-height:520px)]:text-[1.05rem]"
          >
            See what&apos;s happening. Right now.
          </h2>
        </div>

        {/* 2. Explore by vibe — real category cards, browsable without sign-in */}
        <section aria-labelledby="home-explore-vibes">
          <div className="mb-3 flex items-center justify-between gap-2 px-1">
            <h3 id="home-explore-vibes" className="home-display text-[0.72rem] font-bold uppercase tracking-[0.14em] text-foreground">
              Explore by vibe
            </h3>
            <Link
              to="/community"
              className="font-mono text-[0.6rem] font-bold uppercase tracking-[0.2em] text-signal/70 transition-colors hover:text-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
            >
              Open feed &gt;&gt;
            </Link>
          </div>
          <div role="list" className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3">
            {BROADCAST_CATEGORIES.map((lane) => (
              <Link
                key={lane.id}
                to="/community"
                search={{ cat: lane.id }}
                role="listitem"
                className="group relative flex h-32 flex-col overflow-hidden rounded-2xl border border-home-line bg-home-charcoal text-left transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transform-none sm:h-40"
              >
                <img
                  src={BROADCAST_CATEGORY_ART[lane.id]}
                  alt={`${lane.label} category`}
                  loading="lazy"
                  className="absolute inset-0 size-full object-cover transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" aria-hidden />
                <span className="absolute left-2 top-2 grid size-6 place-items-center rounded-md bg-background/70 text-sm backdrop-blur-sm" aria-hidden>
                  {lane.icon}
                </span>
                <span className="relative mt-auto flex min-w-0 flex-col gap-0.5 p-3">
                  <strong className="line-clamp-2 text-sm font-extrabold leading-tight text-foreground group-hover:text-signal">{lane.label}</strong>
                  <small className="line-clamp-1 text-[0.65rem] font-semibold text-muted-foreground">
                    {lane.subcategories.slice(0, 2).join(" · ")}
                  </small>
                </span>
              </Link>
            ))}
          </div>
        </section>

        {/* 2b. Real Estate & Property Pros — professional-tier verification pitch */}
        <section aria-labelledby="home-pros-label">
          <p id="home-pros-label" className="mb-2 px-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.22em] text-tier-gold/80">
            For real estate &amp; property pros
          </p>
          <Link
            to="/verification"
            className="group relative flex flex-col gap-3 overflow-hidden rounded-2xl border border-tier-gold/40 bg-home-obsidian p-4 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-tier-gold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-tier-gold motion-reduce:transform-none sm:flex-row sm:items-center sm:gap-4 sm:p-5"
          >
            <span
              aria-hidden
              className="pointer-events-none absolute left-1/2 top-[-3rem] h-24 w-[70%] -translate-x-1/2 rounded-full bg-tier-gold/10 blur-3xl"
            />
            <span className="relative grid size-12 shrink-0 place-items-center rounded-xl border border-tier-gold/40 bg-tier-gold/10 text-tier-gold">
              <BadgeCheck className="size-6" aria-hidden />
            </span>
            <span className="relative min-w-0 flex-1">
              <span className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                <span className="min-w-0 text-base font-extrabold leading-tight text-foreground group-hover:text-tier-gold">
                  Real Estate &amp; Property Verification
                </span>
                <span className="shrink-0 rounded-full border border-tier-gold/50 bg-tier-gold/10 px-2 py-0.5 font-mono text-[0.55rem] font-extrabold uppercase tracking-[0.18em] text-tier-gold">
                  Pro
                </span>
              </span>
              <span className="mt-1 block text-[0.78rem] font-medium leading-snug text-muted-foreground">
                PIN-verified on-site visits for agents, property managers &amp; builders
              </span>
              <span className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.62rem] font-bold uppercase tracking-[0.12em] text-tier-gold/90">
                <span className="inline-flex items-center gap-1">
                  <ShieldCheck className="size-3.5" aria-hidden /> Escrow-backed
                </span>
                <span className="inline-flex items-center gap-1">
                  <Fingerprint className="size-3.5" aria-hidden /> Identity-confirmed
                </span>
              </span>
            </span>
            <span className="relative inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-tier-gold/50 bg-tier-gold/10 px-3.5 py-2 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-tier-gold transition-colors group-hover:bg-tier-gold group-hover:text-background">
              See how it works <span aria-hidden>&rarr;</span>
            </span>
          </Link>
        </section>

        {/* 3. How Onlooker works — slightly lighter charcoal to separate from hero and feed */}
        <section
          id="how-it-works"
          aria-labelledby="home-how-it-works"
          className="px-1 py-2 sm:rounded-3xl sm:border sm:border-home-line sm:bg-home-charcoal sm:p-5"
        >
          <h3 id="home-how-it-works" className="home-display text-center text-[0.68rem] font-bold uppercase tracking-[0.22em] text-muted-foreground">
            How Onlooker works
          </h3>
          <ol className="mt-4 flex flex-col gap-5 sm:grid sm:grid-cols-3 sm:gap-3">
            {HOW_IT_WORKS.map((step) => {
              const Icon = step.icon;
              return (
                <li
                  key={step.step}
                  className="flex min-w-0 items-start gap-3.5 sm:rounded-2xl sm:border sm:border-home-line sm:bg-home-glass-strong sm:p-4"
                >
                  <span className="relative shrink-0">
                    <img
                      src={step.thumb}
                      alt={step.thumbAlt}
                      loading="lazy"
                      width={512}
                      height={512}
                      className="size-16 rounded-xl border border-home-line object-cover sm:size-20"
                    />
                    <span
                      aria-hidden
                      className="absolute -bottom-1.5 -right-1.5 grid size-7 place-items-center rounded-full border border-signal/40 bg-background text-signal shadow-[0_2px_10px_rgba(0,0,0,0.7)]"
                    >
                      <Icon className="size-3.5" />
                    </span>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[0.55rem] font-bold uppercase tracking-[0.2em] text-muted-foreground">Step {step.step}</span>
                    <span className="mt-0.5 block text-sm font-extrabold text-foreground">{step.title}</span>
                    <span className="mt-1 block text-sm leading-snug text-muted-foreground sm:text-base">{step.body}</span>
                  </span>
                </li>
              );
            })}
          </ol>
        </section>

        {/* 3. One unified activity feed */}
        <section aria-labelledby="home-activity" className="rounded-3xl border border-home-line bg-home-glass p-3.5 backdrop-blur-2xl sm:p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="relative flex size-2" aria-hidden>
                <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal motion-reduce:animate-none" />
                <span className="relative size-2 rounded-full bg-signal" />
              </span>
              <h3 id="home-activity" className="home-display text-[0.72rem] font-bold uppercase tracking-[0.14em] text-foreground">
                Live activity near you
              </h3>
            </div>
            <div role="tablist" aria-label="Filter activity" className="grid grid-cols-4 overflow-hidden rounded-lg border border-border">
              {TABS.map((item) => {
                const active = tab === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setTab(item.key)}
                    className={`min-h-11 px-2 py-2 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal ${
                      active ? "bg-signal text-signal-foreground" : "bg-transparent text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>
          </div>

          {signedIn === false ? (
            <div className="mt-3 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-signal/40 bg-home-glass-strong p-6 text-center">
              <p className="text-[0.72rem] font-extrabold text-foreground">Sign in to see live bounties near you</p>
              <p className="text-[0.62rem] font-semibold text-muted-foreground">Bounties, live streams and alerts are only shown to members. Joining is free.</p>
              <Button asChild size="sm" className="mt-1 h-8 rounded-lg px-3 text-[0.6rem] font-extrabold uppercase">
                <Link to="/auth">Sign in or join free</Link>
              </Button>
            </div>
          ) : activity.length > 0 ? (
            <ul className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {activity.map((request) => {
                const kind = kindOf(request);
                const live = kind === "live";
                const alert = kind === "alert";
                return (
                  <li key={request.id} className="min-w-0">
                    <button
                      type="button"
                      onClick={() => (live ? onOpenLive(request) : alert ? onOpenEmergency(request) : onOpenRequest(request))}
                      className="group flex w-full min-w-0 gap-2.5 overflow-hidden rounded-2xl border border-home-line bg-home-glass-strong p-2.5 text-left backdrop-blur-2xl transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-signal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal motion-reduce:transform-none"
                    >
                      <span className="relative grid size-[3.25rem] shrink-0 place-items-center overflow-hidden rounded-xl border border-home-line">
                        <img src={requestCategoryArt(request.category)} alt="" aria-hidden className="absolute inset-0 size-full object-cover" />
                        <span className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" aria-hidden />
                        {live && (
                          <span className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-0.5 bg-live/85 py-[1px] text-[0.45rem] font-extrabold uppercase tracking-widest text-background">
                            <span className="size-1 animate-pulse rounded-full bg-background motion-reduce:animate-none" aria-hidden /> live
                          </span>
                        )}
                      </span>
                      <span className="flex min-w-0 flex-1 flex-col justify-between gap-1">
                        <span className="flex items-center justify-between gap-1">
                          <span className={`flex items-center gap-1 text-[0.55rem] font-extrabold uppercase ${alert ? "text-crisis" : live ? "text-live" : "text-muted-foreground"}`}>
                            {alert ? <Siren className="size-3" /> : live ? <Radio className="size-3 animate-pulse motion-reduce:animate-none" /> : <Eye className="size-3" />}
                            {alert ? "Alert" : live ? `${request.watchers} watching` : formatAgo(request.minutesAgo)}
                          </span>
                          <span className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-border bg-background/70 px-1.5 py-[1px] font-mono text-[0.55rem] font-bold tabular-nums text-muted-foreground">
                            <CircleDollarSign className="size-2.5" aria-hidden /> {poolOf(request)}
                          </span>
                        </span>
                        <span className="line-clamp-2 text-[0.72rem] font-bold leading-tight text-foreground group-hover:text-signal">{request.title}</span>
                        <span className="flex items-center gap-1 truncate text-[0.55rem] font-medium text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden /> <span className="truncate">{request.place}</span></span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : tab === "all" ? (
            <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ways to start the first stream or bounty nearby">
              {SHOWCASE.map((item) => (
                <ShowcaseCard key={item.key} item={item} onGoLive={onGoLive} onPostBounty={onPostBounty} />
              ))}
            </div>
          ) : (
            <div className="mt-3 flex flex-col items-center justify-center gap-1.5 rounded-2xl border border-home-line bg-home-glass-strong p-6 text-center">
              <p className="text-[0.72rem] font-extrabold text-foreground">Your move — start the first one nearby</p>
              <p className="text-[0.62rem] font-semibold text-muted-foreground">Nothing on this tab yet. Switch to All, or post a bounty and let Onlookers pick it up.</p>
              <Button type="button" size="sm" onClick={onPostBounty} className="mt-1 h-8 rounded-lg px-3 text-[0.6rem] font-extrabold uppercase">
                Post bounty
              </Button>
            </div>
          )}
        </section>

        {/* 4. Recent results — completed bounties with verified proof, looping thumbnails */}
        <RecentCapturesFeed
          limit={null}
          title="Recent results"
          blurb="Verified captures from bounties that already wrapped — tap any card to watch what an Onlooker delivered."
          emptyTeaser={
            <div className="mt-3 flex flex-col items-center justify-center gap-1.5 rounded-xl border border-dashed border-home-line bg-home-glass p-6 text-center">
              <p className="text-[0.72rem] font-extrabold text-foreground">Nothing here yet — be the first to wrap one</p>
              <p className="text-[0.62rem] font-semibold text-muted-foreground">
                Approve your first bounty's proof and this wall fills with what Onlookers captured.
              </p>
              <Button type="button" size="sm" onClick={onPostBounty} className="mt-1 h-8 rounded-lg px-3 text-[0.6rem] font-extrabold uppercase">
                Post bounty
              </Button>
            </div>
          }
        />
      </div>
    </section>
  );
}
