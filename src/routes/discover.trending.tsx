// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Flame, Ticket } from "lucide-react";
import { AreaPicker } from "@/components/AreaPicker";
import { CreatorVibePills } from "@/components/CreatorVibePills";
import { TrendingCard } from "@/components/TrendingCard";
import { EventCard } from "@/components/EventCard";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { usePlaceList } from "@/hooks/use-place-list";
import { usePlacePhotos } from "@/hooks/use-place-photos";
import { useLiveEvents } from "@/hooks/use-live-events";
import { discoveryGroupBySlug } from "@/lib/discovery";
import { useOnlooker } from "@/lib/onlooker-store";
import { cn } from "@/lib/utils";
import type { DiscoveredPlace } from "@/lib/places.functions";
import { RouteErrorPanel, SectionBoundary } from "@/components/SectionBoundary";
import { CREATOR_VIBES } from "@/lib/creator-vibes";
import type { DiscoveryGroup } from "@/lib/discovery";
import { PageBackButton } from "@/components/PageBackButton";


export const Route = createFileRoute("/discover/trending")({
  head: () => ({
    meta: [
      { title: "Trending Feeds & Live Events Near You | Onlooker" },
      {
        name: "description",
        content:
          "Live sports, concerts, fight nights and public gatherings happening around your city this weekend, launch a bounty and get a live view in minutes.",
      },
      { property: "og:title", content: "Trending Feeds & Live Events Near You | Onlooker" },
      {
        property: "og:description",
        content:
          "Weekend games, concerts and hotspots in your region with active bounty counts and one-tap live view requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TrendingScreen,
  errorComponent: RouteErrorPanel,
});

const TAGS = [
  { subId: "stadiums", tag: "Live Sports", keywords: ["sport", "basketball", "football", "baseball", "soccer", "hockey", "tennis", "golf", "motorsport", "racing"] },
  { subId: "concerts", tag: "Concerts", keywords: ["music", "concert", "rock", "pop", "hip", "rap", "country", "jazz", "latin", "metal", "electronic", "r&b", "dance", "alternative", "blues", "folk"] },
  { subId: "fights", tag: "Fight Nights", keywords: ["boxing", "mma", "ufc", "wrestling", "fight", "martial"] },
  { subId: "festivals", tag: "Public Gatherings", keywords: ["festival", "fair", "community", "theatre", "theater", "arts", "comedy", "family", "misc", "expo", "parade", "film"] },
] as const;

/** True when a listed event belongs to the selected tag. */
function eventMatchesTag(
  event: { category: string | null; name: string },
  meta: (typeof TAGS)[number],
) {
  const haystack = `${event.category ?? ""} ${event.name}`.toLowerCase();
  return meta.keywords.some((word) => haystack.includes(word));
}

/** Words that mark a listed event as belonging to a creator vibe. */
const VIBE_EVENT_KEYWORDS: Record<string, string[]> = {
  foodie: ["food", "wine", "beer", "taste", "culinary", "restaurant", "brunch", "dining", "chef"],
  "car-spotters": ["auto", "car", "motor", "racing", "nascar", "monster", "truck", "bike"],
  "style-scout": ["fashion", "style", "pop-up", "market", "expo", "design", "beauty"],
  "street-music": ["music", "concert", "band", "dj", "jazz", "acoustic", "hip", "rock", "latin", "pop"],
  "match-day": ["sport", "basketball", "football", "baseball", "soccer", "hockey", "game", "match"],
  "market-finds": ["market", "flea", "swap", "craft", "vintage", "bazaar", "fair", "expo"],
};

const WEEKEND = [0, 5, 6];

function TrendingScreen() {
  const { requests } = useOnlooker();
  const { area } = useDiscoveryArea();
  const group = discoveryGroupBySlug("events")!;
  const [filter, setFilter] = useState<string | null>(null);
  const [vibeId, setVibeId] = useState<string | null>(null);
  const activeVibe = CREATOR_VIBES.find((vibe) => vibe.id === vibeId) ?? null;

  const sports = usePlaceList(group, "stadiums", area, { maxResults: 20 });
  const concerts = usePlaceList(group, "concerts", area, { maxResults: 20 });
  const fights = usePlaceList(group, "fights", area, { maxResults: 20 });
  const gatherings = usePlaceList(group, "festivals", area, { maxResults: 20 });
  const foodGroup = discoveryGroupBySlug("food");
  const transitGroup = discoveryGroupBySlug("transit");
  const mallsGroup = discoveryGroupBySlug("malls");
  const performancesGroup = discoveryGroupBySlug("performances");
  const marketsGroup = discoveryGroupBySlug("markets");
  const foodie = usePlaceList(foodGroup, null, area, { maxResults: 20, enabled: vibeId === "foodie" });
  const cars = usePlaceList(transitGroup, null, area, { maxResults: 20, enabled: vibeId === "car-spotters" });
  const style = usePlaceList(mallsGroup, null, area, { maxResults: 20, enabled: vibeId === "style-scout" });
  const music = usePlaceList(performancesGroup, null, area, { maxResults: 20, enabled: vibeId === "street-music" });
  const matchDay = usePlaceList(group, "stadiums", area, { maxResults: 20, enabled: vibeId === "match-day" });
  const marketFinds = usePlaceList(marketsGroup, null, area, { maxResults: 20, enabled: vibeId === "market-finds" });
  const { events, loading: eventsLoading } = useLiveEvents(area, {
    radiusMiles: 50,
    weekendOnly: true,
    size: 50,
  });

  const activeTag = TAGS.find((meta) => meta.subId === filter) ?? null;
  const vibeKeywords = activeVibe ? (VIBE_EVENT_KEYWORDS[activeVibe.id] ?? []) : [];
  const visibleEvents = activeVibe
    ? events.filter((event) => {
        const haystack = `${event.category ?? ""} ${event.name}`.toLowerCase();
        return vibeKeywords.some((word) => haystack.includes(word));
      })
    : activeTag
      ? events.filter((event) => eventMatchesTag(event, activeTag))
      : events;


  const buckets = [sports, concerts, fights, gatherings];
  const vibeBuckets: Record<string, { group: DiscoveryGroup | undefined; places: DiscoveredPlace[]; loading: boolean }> = {
    foodie: { group: foodGroup, places: foodie.places, loading: foodie.loading },
    "car-spotters": { group: transitGroup, places: cars.places, loading: cars.loading },
    "style-scout": { group: mallsGroup, places: style.places, loading: style.loading },
    "street-music": { group: performancesGroup, places: music.places, loading: music.loading },
    "match-day": { group, places: matchDay.places, loading: matchDay.loading },
    "market-finds": { group: marketsGroup, places: marketFinds.places, loading: marketFinds.loading },
  };
  const activeBucket = activeVibe ? vibeBuckets[activeVibe.id] : null;
  const loading = activeBucket ? activeBucket.loading : buckets.some((b) => b.loading);

  const seen = new Set<string>();
  const items: Array<{ place: DiscoveredPlace; tag: string; group: DiscoveryGroup }> = [];
  if (activeVibe && activeBucket?.group) {
    for (const place of activeBucket.places) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      items.push({ place, tag: activeVibe.label, group: activeBucket.group });
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
    <div className="app-shell pb-28 pt-safe">
      <PageBackButton label="Browse places" fallback="/discover" />

      <h1 className="mt-3 inline-flex items-center gap-2 font-display text-3xl tracking-tight text-foreground">
        <Flame className="size-6 text-signal" aria-hidden /> Trending feeds
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {activeVibe
          ? `${activeVibe.label} streams and places around ${area.label}.`
          : `${weekend ? "Happening this weekend" : "Coming up"} around ${area.label}, tap any card to launch a live view from that exact spot.`}
      </p>

      <div className="mt-4">
        <CreatorVibePills
          activeId={vibeId}
          onSelect={(vibe) => {
            setVibeId(vibe?.id ?? null);
            setFilter(null);
          }}
        />
      </div>

      <div className="mt-4">
        <SectionBoundary label="Area picker">
          <AreaPicker />
        </SectionBoundary>
      </div>

      {!activeVibe && <div className="mt-3 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
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

      {(eventsLoading || visibleEvents.length > 0) && (
        <section className="mt-5">
          <h2 className="inline-flex items-center gap-2 font-display text-lg text-foreground">
            <Ticket className="size-4 text-signal" aria-hidden />{" "}
            {activeVibe ? `${activeVibe.label} events` : activeTag ? activeTag.tag : "Live events this weekend"}
          </h2>
          <p className="text-xs text-muted-foreground">
            {activeTag
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



      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
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
      </div>
    </div>
  );
}
