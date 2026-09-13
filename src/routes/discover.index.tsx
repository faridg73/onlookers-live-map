import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Flame, LayoutGrid, Map as MapIcon, Radar, X } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { RadarAlerts } from "@/components/RadarAlerts";
import { AreaPicker } from "@/components/AreaPicker";
import { DISCOVERY_GROUPS, discoveryGroupBySlug, placeSlug } from "@/lib/discovery";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { usePlaceList } from "@/hooks/use-place-list";
import { useOnlooker } from "@/lib/onlooker-store";
import { useRadar } from "@/hooks/use-radar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discover/")({
  head: () => ({
    meta: [
      { title: "Browse Places Near You — Onlooker Live Views" },
      {
        name: "description",
        content:
          "Browse live sports and events, nightlife strips, malls, airports, coastlines and landmarks around your city, then request a live view.",
      },
      { property: "og:title", content: "Browse Places Near You — Onlooker Live Views" },
      {
        property: "og:description",
        content:
          "Trending events, live sports and local hotspots around your city — request a live view from someone already there.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverHome,
});

const WEEKEND = [0, 5, 6];

function DiscoverHome() {
  const { requests, claim } = useOnlooker();
  const { spots, remove } = useRadar();
  const { area } = useDiscoveryArea();
  const [view, setView] = useState<"grid" | "map">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const eventsGroup = discoveryGroupBySlug("events");
  const { places: eventPlaces, loading: eventsLoading } = usePlaceList(eventsGroup, null, area, {
    maxResults: 8,
  });

  const isWeekend = WEEKEND.includes(new Date().getDay());
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const liveNear = (name: string) =>
    requests.filter(
      (r) => r.status === "open" && `${r.place} ${r.title}`.toLowerCase().includes(name.toLowerCase()),
    ).length;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <RadarAlerts />

      <h1 className="font-display text-3xl tracking-tight text-foreground">Browse places</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything here is pulled live from the area you're browsing — pick a spot and ask for a
        view.
      </p>

      <div className="mt-4">
        <AreaPicker />
      </div>

      <Link
        to="/discover/trending"
        className="mt-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-signal/50 bg-signal/10 px-4 py-3"
      >
        <span className="inline-flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Flame className="size-4 text-signal" aria-hidden /> Trending feeds & live events
        </span>
        <ChevronRight className="size-4 text-signal" aria-hidden />
      </Link>


      <div className="mt-3 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1">
        {(
          [
            { id: "grid", label: "Categories", icon: LayoutGrid },
            { id: "map", label: "Live map", icon: MapIcon },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setView(tab.id)}
            aria-pressed={view === tab.id}
            className={cn(
              "flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-extrabold uppercase tracking-[0.14em] transition-colors",
              view === tab.id ? "bg-signal text-signal-foreground" : "text-muted-foreground",
            )}
          >
            <tab.icon className="size-4" aria-hidden />
            {tab.label}
          </button>
        ))}
      </div>

      {view === "map" ? (
        <div className="mt-4 space-y-3">
          <div className="h-[26rem] overflow-hidden rounded-2xl border border-border">
            <MapCanvas requests={requests} selectedId={selectedId} onSelect={setSelectedId} />
          </div>
          {selected ? (
            <BountyDetailsDialog request={selected} onClaim={claim}>
              <RequestCard request={selected} compact />
            </BountyDetailsDialog>
          ) : (
            <p className="rounded-2xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Tap a pulsing marker to see the bounty behind it.
            </p>
          )}
        </div>
      ) : (
        <>
          {eventsGroup && (
            <section className="mt-5">
              <div className="flex items-end justify-between gap-3">
                <div>
                  <h2 className="inline-flex items-center gap-2 font-display text-lg text-foreground">
                    <Flame className="size-4 text-signal" aria-hidden /> Trending events & live
                    sports
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {isWeekend ? "On this weekend" : "Coming up"} around {area.label}
                  </p>
                </div>
                <Link
                  to="/discover/trending"
                  className="shrink-0 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-signal"
                >
                  See all
                </Link>
              </div>

              <div className="mt-3 -mx-4 flex gap-3 overflow-x-auto px-4 pb-2">
                {eventsLoading && eventPlaces.length === 0
                  ? [0, 1, 2].map((i) => (
                      <div
                        key={i}
                        className="h-28 w-44 shrink-0 animate-pulse rounded-2xl border border-border bg-surface"
                      />
                    ))
                  : eventPlaces.slice(0, 8).map((place) => {
                      const live = liveNear(place.name);
                      return (
                        <Link
                          key={place.id}
                          to="/discover/$group/$venue"
                          params={{ group: eventsGroup.slug, venue: placeSlug(place.id) }}
                          className="flex w-44 shrink-0 flex-col justify-between rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-signal/60"
                        >
                          <span className="text-2xl" aria-hidden>
                            {eventsGroup.emoji}
                          </span>
                          <span className="mt-2 line-clamp-2 text-sm font-bold text-foreground">
                            {place.name}
                          </span>
                          <span className="mt-1 truncate text-[0.68rem] text-muted-foreground">
                            {place.primaryType ?? "Venue"}
                            {place.rating ? ` · ${place.rating.toFixed(1)}★` : ""}
                          </span>
                          {live > 0 && (
                            <span className="mt-1 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-signal">
                              {live} live now
                            </span>
                          )}
                        </Link>
                      );
                    })}
                {!eventsLoading && eventPlaces.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                    No event venues found around {area.label} yet — try another city.
                  </p>
                )}
              </div>
            </section>
          )}

          <div className="mt-4 space-y-3">
            {DISCOVERY_GROUPS.map((group) => (
              <Link
                key={group.slug}
                to="/discover/$group"
                params={{ group: group.slug }}
                className="block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-signal/60"
              >
                <div
                  className={`flex h-24 items-center justify-between bg-gradient-to-br px-5 ${group.art}`}
                >
                  <span className="text-4xl" aria-hidden>
                    {group.emoji}
                  </span>
                  <span className="rounded-full bg-background/70 px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-foreground">
                    Near {area.label.split(",")[0]}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-foreground">{group.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{group.tagline}</p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <p className="inline-flex items-center gap-2 font-display text-base text-foreground">
          <Radar className="size-4 text-signal" aria-hidden /> Bounty Radar
        </p>
        {spots.length === 0 ? (
          <p className="mt-1 text-xs text-muted-foreground">
            Follow a spot from any place page and we'll alert you when a new bounty is posted
            within five miles of it.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {spots.map((spot) => (
              <li
                key={spot.slug}
                className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-foreground">{spot.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{spot.area}</p>
                </div>
                <button
                  type="button"
                  onClick={() => remove(spot.slug)}
                  aria-label={`Stop following ${spot.name}`}
                  className="rounded-full p-1.5 text-muted-foreground hover:text-foreground"
                >
                  <X className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 flex gap-2">
        <Link
          to="/feed"
          className="flex-1 rounded-xl border border-border bg-surface py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
          Live feed
        </Link>
        <Link
          to="/explore"
          className="flex-1 rounded-xl border border-border bg-surface py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-foreground"
        >
          Explore clips
        </Link>
      </div>
    </div>
  );
}
