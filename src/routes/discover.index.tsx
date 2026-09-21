// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ChevronRight, Flame, LayoutGrid, Map as MapIcon, Radar, X } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { ScrollableLane } from "@/components/ScrollableLane";

import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { RadarAlerts } from "@/components/RadarAlerts";
import { AreaPicker } from "@/components/AreaPicker";
import { LocationSearchBar } from "@/components/LocationSearchBar";

import { DISCOVERY_GROUPS, discoveryGroupBySlug, placeSlug } from "@/lib/discovery";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { usePlaceList } from "@/hooks/use-place-list";
import { usePlacePhotos } from "@/hooks/use-place-photos";
import { useOnlooker } from "@/lib/onlooker-store";
import { useRadar } from "@/hooks/use-radar";
import { cn } from "@/lib/utils";
import { PlacePhoto } from "@/components/PlacePhoto";
import { useSessionScroll } from "@/hooks/use-session-scroll";
import { readSessionState, writeSessionState } from "@/lib/session-state";
import { discoveryImage } from "@/lib/discovery-visuals";
import { RouteErrorPanel, SectionBoundary } from "@/components/SectionBoundary";

export const Route = createFileRoute("/discover/")({
  head: () => ({
    meta: [
      { title: "Browse Places Near You | Onlooker Views" },
      {
        name: "description",
        content:
          "Browse live sports and events, nightlife strips, malls, airports, coastlines and landmarks around your city, then request a live view.",
      },
      { property: "og:title", content: "Browse Places Near You | Onlooker Views" },
      {
        property: "og:description",
        content:
          "Trending events, live sports and local hotspots around your city, request a live view from someone already there.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverHome,
  errorComponent: RouteErrorPanel,
});

const WEEKEND = [0, 5, 6];

function DiscoverHome() {
  const { requests, claim } = useOnlooker();
  const { spots, remove } = useRadar();
  const { area } = useDiscoveryArea();
  const [view, setView] = useState<"grid" | "map">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const restored = useRef(false);

  useSessionScroll("onlooker:scroll:discover");

  useEffect(() => {
    const saved = readSessionState<{ view?: "grid" | "map"; selectedId?: string | null }>("onlooker:view:discover", {});
    if (saved.view === "grid" || saved.view === "map") setView(saved.view);
    setSelectedId(saved.selectedId ?? null);
    restored.current = true;
  }, []);

  useEffect(() => {
    if (restored.current) writeSessionState("onlooker:view:discover", { view, selectedId });
  }, [view, selectedId]);

  const eventsGroup = discoveryGroupBySlug("events");
  const { places: eventPlaces, loading: eventsLoading } = usePlaceList(eventsGroup, null, area, {
    maxResults: 8,
  });
  const eventPhoto = usePlacePhotos(eventPlaces);

  // Client-only: server and browser timezones differ, so decide after hydration.
  const [isWeekend, setIsWeekend] = useState(false);
  useEffect(() => {
    setIsWeekend(WEEKEND.includes(new Date().getDay()));
  }, []);
  const selected = requests.find((r) => r.id === selectedId) ?? null;

  const liveNear = (name: string) =>
    requests.filter(
      (r) => r.status === "open" && `${r.place} ${r.title}`.toLowerCase().includes(name.toLowerCase()),
    ).length;

  return (
    <div className="app-shell pb-28 pt-safe">
      <RadarAlerts />

      <h1 className="font-display text-3xl tracking-tight text-foreground">
        Browse <span className="text-signal">places</span>
      </h1>
      <p className="mt-1 text-sm text-foreground/90">
        Pulled <span className="font-bold text-signal">live</span> from the area you&apos;re
        browsing, pick a spot and ask for a view.
      </p>

      <LocationSearchBar className="mt-4" />

      <div className="mt-4">
        <AreaPicker />
      </div>


      <Link
        to="/discover/trending"
        className="mt-3 flex items-center justify-between gap-3 rounded-2xl border-2 border-signal/50 bg-signal/10 px-4 py-3"
      >
        <span className="inline-flex items-center gap-2 text-sm font-extrabold text-foreground">
          <Flame className="size-4 text-signal" aria-hidden /> Trending feeds &amp;{" "}
          <span className="text-signal">live events</span>
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
          <button
            type="button"
            onClick={() => setView("grid")}
            aria-label="Back to Browse places"
            className="relative z-10 inline-flex min-h-11 items-center gap-2 rounded-full border border-border bg-secondary/80 px-3 py-2 text-sm font-bold text-foreground shadow-sm transition-colors hover:border-signal/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ArrowLeft className="size-4 text-signal" aria-hidden />
            Browse places
          </button>
          <div className="h-[22rem] overflow-hidden rounded-2xl border border-border sm:h-[30rem] lg:h-[38rem]">
            <SectionBoundary label="The map">
              <MapCanvas requests={requests} selectedId={selectedId} onSelect={setSelectedId} viewportStorageKey="onlooker:map:discover" />
            </SectionBoundary>
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
                    <Flame className="size-4 text-signal" aria-hidden /> Trending events &amp;{" "}
                    <span className="text-signal">live sports</span>
                  </h2>
                  <p className="text-xs text-foreground/90">
                    <span className="font-bold text-signal">{isWeekend ? "On this weekend" : "Coming up"}</span>{" "}
                    around <span className="font-bold text-signal">{area.label}</span>
                  </p>
                </div>
                <Link
                  to="/discover/trending"
                  className="shrink-0 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-signal"
                >
                  See all
                </Link>
              </div>

              <ScrollableLane className="mt-3 -mx-4" innerClassName="gap-3 px-4 pb-2" ariaLabel="Trending events and live sports">
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
                          className="w-44 shrink-0 overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-signal/60"
                        >
                          <div className="h-20 overflow-hidden bg-surface-raised">
                            <PlacePhoto
                              src={eventPhoto(place)}
                              fallbackSrc={discoveryImage(eventsGroup.slug)}
                              alt={`${place.name} venue`}
                            />
                          </div>
                          <div className="p-3">
                            <span className="line-clamp-2 text-sm font-bold text-foreground">
                              {place.name}
                            </span>
                            <span className="mt-1 block truncate text-[0.68rem] text-muted-foreground">
                              {place.primaryType ?? "Venue"}
                              {place.rating ? ` · ${place.rating.toFixed(1)}★` : ""}
                            </span>
                            {live > 0 && (
                              <span className="mt-1 block text-[0.62rem] font-extrabold uppercase tracking-[0.1em] text-signal">
                                {live} live now
                              </span>
                            )}
                          </div>
                        </Link>
                      );
                    })}
                {!eventsLoading && eventPlaces.length === 0 && (
                  <p className="rounded-2xl border border-dashed border-border p-4 text-xs text-muted-foreground">
                    No event venues found around {area.label} yet, try another city.
                  </p>
                )}
              </ScrollableLane>

            </section>
          )}

          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {DISCOVERY_GROUPS.map((group) => (
              <Link
                key={group.slug}
                to="/discover/$group"
                params={{ group: group.slug }}
                className="block overflow-hidden rounded-2xl border border-border bg-surface transition-colors hover:border-signal/60"
              >
                <div className="relative h-28 overflow-hidden">
                  <PlacePhoto
                    src={discoveryImage(group.slug)}
                    fallbackSrc={discoveryImage(group.slug)}
                    alt={`${group.name} near ${area.label}`}
                  />
                  <span className="absolute inset-0 bg-gradient-to-t from-background/70 via-transparent to-transparent" />
                  <span className="absolute right-3 top-3 rounded-full bg-background/80 px-2.5 py-1 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-foreground backdrop-blur-sm">
                    Near {area.label.split(",")[0]}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-foreground">
                      <span className="text-signal">{group.name.split(" ")[0]}</span>
                      {group.name.includes(" ") ? ` ${group.name.split(" ").slice(1).join(" ")}` : ""}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      <span className="font-bold text-signal">{group.tagline.split(",")[0]}</span>
                      {group.tagline.includes(",") ? `, ${group.tagline.split(",").slice(1).join(",").trim()}` : ""}
                    </p>
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
          <Radar className="size-4 text-signal" aria-hidden /> Bounty <span className="text-signal">Radar</span>
        </p>
        {spots.length === 0 ? (
          <p className="mt-1 text-xs text-foreground/90">
            Follow a spot from any place page and we&apos;ll alert you when a new bounty is posted{" "}
            <span className="font-bold text-signal">within five miles</span> of it.
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
          className="flex-1 rounded-xl border border-signal/40 bg-surface py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/10"
        >
          Live feed
        </Link>
        <Link
          to="/explore"
          className="flex-1 rounded-xl border border-signal/40 bg-surface py-3 text-center text-xs font-bold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/10"
        >
          Explore clips
        </Link>
      </div>
    </div>
  );
}
