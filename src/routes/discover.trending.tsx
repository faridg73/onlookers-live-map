import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Flame, Ticket } from "lucide-react";
import { AreaPicker } from "@/components/AreaPicker";
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


export const Route = createFileRoute("/discover/trending")({
  head: () => ({
    meta: [
      { title: "Trending Feeds & Live Events Near You — Onlooker" },
      {
        name: "description",
        content:
          "Live sports, concerts, fight nights and public gatherings happening around your city this weekend — launch a bounty and get a live view in minutes.",
      },
      { property: "og:title", content: "Trending Feeds & Live Events Near You — Onlooker" },
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
});

const TAGS = [
  { subId: "stadiums", tag: "Live Sports" },
  { subId: "concerts", tag: "Concerts" },
  { subId: "fights", tag: "Fight Nights" },
  { subId: "festivals", tag: "Public Gatherings" },
] as const;

const WEEKEND = [0, 5, 6];

function TrendingScreen() {
  const { requests } = useOnlooker();
  const { area } = useDiscoveryArea();
  const group = discoveryGroupBySlug("events")!;
  const [filter, setFilter] = useState<string | null>(null);

  const sports = usePlaceList(group, "stadiums", area, { maxResults: 8 });
  const concerts = usePlaceList(group, "concerts", area, { maxResults: 8 });
  const fights = usePlaceList(group, "fights", area, { maxResults: 8 });
  const gatherings = usePlaceList(group, "festivals", area, { maxResults: 8 });

  const buckets = [sports, concerts, fights, gatherings];
  const loading = buckets.some((b) => b.loading);

  const seen = new Set<string>();
  const items: Array<{ place: DiscoveredPlace; tag: string }> = [];
  buckets.forEach((bucket, index) => {
    const meta = TAGS[index]!;
    if (filter && filter !== meta.subId) return;
    for (const place of bucket.places) {
      if (seen.has(place.id)) continue;
      seen.add(place.id);
      items.push({ place, tag: meta.tag });
    }
  });

  items.sort((a, b) => (b.place.ratingCount ?? 0) - (a.place.ratingCount ?? 0));

  const photoOf = usePlacePhotos(items.slice(0, 16).map((item) => item.place));
  const weekend = WEEKEND.includes(new Date().getDay());

  const liveNear = (name: string) =>
    requests.filter(
      (r) =>
        (r.status === "open" || r.status === "claimed") &&
        `${r.place} ${r.title}`.toLowerCase().includes(name.toLowerCase()),
    ).length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <Link to="/discover" className="text-xs font-bold uppercase tracking-[0.14em] text-signal">
        ← Browse places
      </Link>

      <h1 className="mt-3 inline-flex items-center gap-2 font-display text-3xl tracking-tight text-foreground">
        <Flame className="size-6 text-signal" aria-hidden /> Trending feeds
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {weekend ? "Happening this weekend" : "Coming up"} around {area.label} — tap any card to
        launch a live view from that exact spot.
      </p>

      <div className="mt-4">
        <AreaPicker />
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
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
      </div>

      <div className="mt-4 space-y-3">
        {items.map((item) => (
          <TrendingCard
            key={item.place.id}
            place={item.place}
            group={group}
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
            No trending venues found around {area.label} yet — try another city above.
          </p>
        )}
      </div>
    </div>
  );
}
