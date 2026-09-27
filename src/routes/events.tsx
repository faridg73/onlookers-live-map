// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Grid2x2, Ticket } from "lucide-react";
import { AreaPicker } from "@/components/AreaPicker";
import { CreatorVibePills } from "@/components/CreatorVibePills";
import { TrendingCard } from "@/components/TrendingCard";
import { EventCard } from "@/components/EventCard";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { usePlaceList } from "@/hooks/use-place-list";
import { usePlacePhotos } from "@/hooks/use-place-photos";
import { useLiveEvents } from "@/hooks/use-live-events";
import { discoveryGroupBySlug, isBigBoxPlace } from "@/lib/discovery";
import { useOnlooker } from "@/lib/onlooker-store";
import { cn } from "@/lib/utils";
import type { DiscoveredPlace } from "@/lib/places.functions";
import { RouteErrorPanel, SectionBoundary } from "@/components/SectionBoundary";
import { CREATOR_VIBES } from "@/lib/creator-vibes";
import type { DiscoveryGroup } from "@/lib/discovery";
import { PageBackButton } from "@/components/PageBackButton";
import { VibeOwnContent } from "@/components/VibeOwnContent";


export const Route = createFileRoute("/events")({
  head: () => ({
    meta: [
      { title: "Venues & Events Near You — Live Crowd Views | Onlooker" },
      {
        name: "description",
        content:
          "Browse venues and events around your city — live sports, concerts, fight nights, comedy, theater, festivals and expos — see the crowd, then launch a live view bounty from that exact spot.",
      },
      { property: "og:title", content: "Venues & Events Near You — Live Crowd Views | Onlooker" },
      {
        property: "og:description",
        content:
          "Stadiums, concert halls and hotspots in your region with active bounty counts and one-tap live view requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: EventsScreen,
  errorComponent: RouteErrorPanel,
});

// Mirrors the provider taxonomies: Ticketmaster segments (Music, Sports, Arts & Theatre,
// Miscellaneous), SeatGeek types (theater, broadway, comedy, …) and Eventbrite categories
// (performing arts, comedy, expos, festivals & fairs).
const TAGS = [
  { subId: "stadiums", tag: "Live Sports", keywords: ["sport", "basketball", "football", "baseball", "soccer", "hockey", "tennis", "golf", "motorsport", "racing"] },
  { subId: "concerts", tag: "Concerts", keywords: ["music", "concert", "rock", "pop", "hip", "rap", "country", "jazz", "latin", "metal", "electronic", "r&b", "alternative", "blues", "folk"] },
  { subId: "fights", tag: "Fight Nights", keywords: ["boxing", "mma", "ufc", "wrestling", "fight", "martial"] },
  { subId: "comedy", tag: "Comedy", keywords: ["comedy", "comedian", "stand-up", "standup", "improv"] },
  { subId: "theater", tag: "Theater & Arts", keywords: ["theatre", "theater", "broadway", "musical", "opera", "ballet", "dance", "classical", "performing arts", "arts"] },
  { subId: "festivals", tag: "Festivals & Fairs", keywords: ["festival", "fair", "parade", "carnival", "food & drink", "community", "family"] },
  { subId: "expos", tag: "Expos & Trade Shows", keywords: ["expo", "trade show", "convention", "conference", "summit", "exhibition"] },
] as const;

/** True when a listed event belongs to the selected tag. */
function eventMatchesTag(
  event: { category: string | null; name: string },
  meta: (typeof TAGS)[number],
) {
  const haystack = `${event.category ?? ""} ${event.name}`.toLowerCase();
  return meta.keywords.some((word) => haystack.includes(word));
}

const WEEKEND = [0, 5, 6];

function EventsScreen() {
  const { requests } = useOnlooker();
  const { area } = useDiscoveryArea();
  const group = discoveryGroupBySlug("events")!;
  const [filter, setFilter] = useState<string | null>(null);
  const [vibeId, setVibeId] = useState<string | null>(null);
  const [subFilter, setSubFilter] = useState<string | null>(null);
  const activeVibe = CREATOR_VIBES.find((vibe) => vibe.id === vibeId) ?? null;
  const activeSub = activeVibe?.subFilters.find((s) => s.label === subFilter) ?? null;
  const hidePlaces = Boolean(activeVibe?.ownContent?.hidePlaces);

  const sports = usePlaceList(group, "stadiums", area, { maxResults: 20 });
  const concerts = usePlaceList(group, "concerts", area, { maxResults: 20 });
  const fights = usePlaceList(group, "fights", area, { maxResults: 20 });
  const comedy = usePlaceList(group, "comedy", area, { maxResults: 20 });
  const theater = usePlaceList(group, "theater", area, { maxResults: 20 });
  const gatherings = usePlaceList(group, "festivals", area, { maxResults: 20 });
  const expos = usePlaceList(group, "expos", area, { maxResults: 20 });
  const vibeGroup = activeVibe ? discoveryGroupBySlug(activeVibe.groupSlug) : undefined;
  const vibePlaces = usePlaceList(vibeGroup, activeSub?.subId ?? activeVibe?.subId ?? null, area, {
    maxResults: 20,
    enabled: Boolean(activeVibe && vibeGroup && !hidePlaces),
  });
  const { events, loading: eventsLoading } = useLiveEvents(area, {
    radiusMiles: 50,
    weekendOnly: true,
    size: 50,
  });

  const activeTag = TAGS.find((meta) => meta.subId === filter) ?? null;
  const vibeKeywords = activeVibe?.eventKeywords ?? [];
  const subKeywords = activeSub?.keywords ?? [];
  const visibleEvents = activeVibe
    ? events.filter((event) => {
        const haystack = `${event.category ?? ""} ${event.name}`.toLowerCase();
        if (!vibeKeywords.some((word) => haystack.includes(word))) return false;
        return subKeywords.length === 0 || subKeywords.some((word) => haystack.includes(word));
      })
    : activeTag
      ? events.filter((event) => eventMatchesTag(event, activeTag))
      : events;

  const buckets = [sports, concerts, fights, comedy, theater, gatherings, expos];
  const activeBucket = activeVibe
    ? { group: vibeGroup, places: vibePlaces.places, loading: vibePlaces.loading }
    : null;
  const loading = activeBucket ? activeBucket.loading : buckets.some((b) => b.loading);

  const seen = new Set<string>();
  const items: Array<{ place: DiscoveredPlace; tag: string; group: DiscoveryGroup }> = [];
  if (activeVibe && activeBucket?.group) {
    for (const place of activeBucket.places) {
      if (seen.has(place.id)) continue;
      // Big-box discount chains are what made the style lane read as filler.
      if (activeVibe.excludeBigBox && isBigBoxPlace(place.name)) continue;
      seen.add(place.id);
      items.push({ place, tag: activeSub?.label ?? activeVibe.label, group: activeBucket.group });
    }
  } else {
    buckets.forEach((bucket, index) => {
      const meta = TAGS[index]!;
      if (filter && filter !== meta.subId) return;
      for (const place of bucket.places) {
        if (seen.has(place.id)) continue;
        seen.add(place.id);
        items.push({ place, tag: meta.tag, group });
      }
    });
  }

  items.sort((a, b) => (b.place.ratingCount ?? 0) - (a.place.ratingCount ?? 0));

  const photoOf = usePlacePhotos(items.map((item) => item.place));
  const weekend = WEEKEND.includes(new Date().getDay());

  const liveNear = (name: string) =>
    requests.filter(
      (r) =>
        (r.status === "open" || r.status === "claimed") &&
        `${r.place} ${r.title}`.toLowerCase().includes(name.toLowerCase()),
    ).length;

  return (
    <div className="discover-inter app-shell pb-32 pt-safe">
      <PageBackButton label="Home" fallback="/" />

      <div className="relative mt-4 overflow-hidden rounded-3xl border border-home-line bg-home-obsidian px-5 pb-5 pt-5">
        <div className="absolute left-5 right-5 top-0 h-px bg-gradient-to-r from-transparent via-home-accent/65 to-transparent" aria-hidden />
        <div className="pointer-events-none absolute left-1/2 top-[-3rem] h-32 w-[70%] -translate-x-1/2 rounded-full bg-signal/10 blur-3xl" aria-hidden />
        <p className="relative inline-flex items-center gap-2 border border-signal/30 bg-signal/5 px-3 py-1 font-mono text-[0.62rem] font-bold uppercase tracking-[0.25em] text-signal">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-signal" />
          </span>
          Crowd radar // live
        </p>
        <h1 className="relative mt-3 inline-flex items-center gap-2 text-3xl font-extrabold italic uppercase leading-[0.95] tracking-tighter text-signal drop-shadow-[0_0_22px_color-mix(in_oklab,var(--color-signal)_35%,transparent)]">
          <Flame className="size-6 shrink-0" aria-hidden /> Venues &amp; events
        </h1>
        <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">
          {activeVibe
            ? `${activeVibe.label} streams and places around ${area.label}.`
            : `${weekend ? "Happening this weekend" : "Coming up"} around ${area.label} — tap any card to launch a live view from that exact spot.`}
        </p>

        <Link
          to="/discover"
          className="group relative mt-3 flex items-center justify-between gap-2 border-y border-home-line py-2.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
        >
          <span className="inline-flex min-w-0 items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-foreground/80 transition-colors group-hover:text-signal">
            <Grid2x2 className="size-3.5 shrink-0 text-signal" aria-hidden />
            <span className="truncate">Browse categories</span>
          </span>
          <span className="font-mono text-xs text-signal/70 transition-transform group-hover:translate-x-0.5" aria-hidden>&gt;&gt;</span>
        </Link>
      </div>

      <div className="mt-4">
        <CreatorVibePills
          activeId={vibeId}
          onSelect={(vibe) => {
            setVibeId(vibe?.id ?? null);
            setFilter(null);
            setSubFilter(null);
          }}
        />
      </div>

      <div className="mt-4">
        <SectionBoundary label="Area picker">
          <AreaPicker />
        </SectionBoundary>
      </div>

      {!activeVibe && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-4">
        <button
          type="button"
          onClick={() => setFilter(null)}
          aria-pressed={filter === null}
          className={cn(
            "rounded-xl border py-2.5 text-[0.66rem] font-extrabold uppercase tracking-[0.12em] transition-colors",
            filter === null
              ? "border-signal bg-signal text-signal-foreground"
              : "border-border bg-surface text-muted-foreground",
          )}
        >
          All trending
        </button>
        {TAGS.map((meta) => (
          <button
            key={meta.subId}
            type="button"
            onClick={() => setFilter(meta.subId)}
            aria-pressed={filter === meta.subId}
            className={cn(
              "rounded-xl border py-2.5 text-[0.66rem] font-extrabold uppercase tracking-[0.12em] transition-colors",
              filter === meta.subId
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface text-muted-foreground",
            )}
          >
            {meta.tag}
          </button>
        ))}
      </div>}

      {activeVibe && (
        <div className="mt-3">
          <p className="text-[0.6rem] font-extrabold uppercase tracking-[0.18em] text-muted-foreground">
            Narrow it down
          </p>
          <div className="-mx-1 mt-2 flex snap-x gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
            <button
              type="button"
              onClick={() => setSubFilter(null)}
              aria-pressed={subFilter === null}
              className={cn(
                "shrink-0 snap-start rounded-xl border px-3 py-2 text-[0.64rem] font-extrabold uppercase tracking-[0.1em] transition-colors",
                subFilter === null
                  ? "border-signal bg-signal text-signal-foreground"
                  : "border-border bg-surface text-muted-foreground",
              )}
            >
              All {activeVibe.label.split(" ")[0]}
            </button>
            {activeVibe.subFilters.map((sub) => (
              <button
                key={sub.label}
                type="button"
                onClick={() => setSubFilter(sub.label === subFilter ? null : sub.label)}
                aria-pressed={subFilter === sub.label}
                className={cn(
                  "shrink-0 snap-start rounded-xl border px-3 py-2 text-[0.64rem] font-extrabold uppercase tracking-[0.1em] transition-colors",
                  subFilter === sub.label
                    ? "border-signal bg-signal text-signal-foreground"
                    : "border-border bg-surface text-muted-foreground",
                )}
              >
                {sub.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeVibe?.ownContent && (
        <SectionBoundary label="Onlooker activity">
          <VibeOwnContent vibe={activeVibe} keywords={activeSub?.keywords ?? []} />
        </SectionBoundary>
      )}

      {(eventsLoading || visibleEvents.length > 0) && (
        <section className="mt-5">
          <h2 className="inline-flex items-center gap-2 text-lg font-extrabold italic uppercase tracking-tight text-foreground">
            <Ticket className="size-4 text-signal" aria-hidden />{" "}
            {activeVibe ? `${activeVibe.label} events` : activeTag ? activeTag.tag : "Live events this weekend"}
          </h2>
          <p className="text-xs font-semibold text-signal">
            {activeVibe
              ? `${visibleEvents.length} ${activeVibe.label.toLowerCase()} listings around ${area.label}.`
              : activeTag
                ? `${visibleEvents.length} ${activeTag.tag.toLowerCase()} listings around ${area.label}.`
                : `Real games, concerts and shows on sale around ${area.label}.`}
          </p>

          <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {eventsLoading && visibleEvents.length === 0
              ? [0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-2xl border border-border bg-surface"
                  />
                ))
              : visibleEvents.map((event) => (
                  <EventCard key={event.id} event={event} liveCount={liveNear(event.name)} />
                ))}
          </div>

          <p className="mt-2 text-[0.62rem] text-muted-foreground">
            Event listings and ticket links provided by Ticketmaster.
          </p>
        </section>
      )}



      {!hidePlaces && <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {items.map((item) => (
          <TrendingCard
            key={item.place.id}
            place={item.place}
            group={item.group}
            tag={item.tag}
            photoUrl={photoOf(item.place)}
            liveCount={liveNear(item.place.name)}
            weekend={weekend}
          />
        ))}

        {loading &&
          items.length === 0 &&
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-2xl border border-border bg-surface" />
          ))}

        {!loading && items.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No trending venues found around {area.label} yet, try another city above.
          </p>
        )}
      </div>}
    </div>
  );
}
