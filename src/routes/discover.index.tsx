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
import { TwoToneName } from "@/components/TwoTone";

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
  // Deep link from a place or category: /discover?view=map&lat=..&lng=..&label=..
  validateSearch: (
    search: Record<string, unknown>,
  ): { view?: "map"; lat?: number; lng?: number; label?: string } => {
    const lat = Number(search["lat"]);
    const lng = Number(search["lng"]);
    const label = typeof search["label"] === "string" ? search["label"] : undefined;
    return {
      ...(search["view"] === "map" ? { view: "map" as const } : {}),
      ...(Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : {}),
      ...(label ? { label } : {}),
    };
  },
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
    const saved = readSessionState<{
      view?: "grid" | "map";
      selectedId?: string | null;
    }>("onlooker:view:discover", {});
    if (saved.view === "grid" || saved.view === "map") setView(saved.view);
    setSelectedId(saved.selectedId ?? null);
    restored.current = true;
  }, []);

  useEffect(() => {
    if (restored.current) writeSessionState("onlooker:view:discover", { view, selectedId });
  }, [view, selectedId]);

  // A deep-linked place wins; otherwise the map focuses the browsing area.
  const search = Route.useSearch();
  const target =
    typeof search.lat === "number" && typeof search.lng === "number"
      ? { lat: search.lat, lng: search.lng, label: search.label ?? "Chosen spot" }
      : { lat: area.latitude, lng: area.longitude, label: area.label };

  // Opening the map (or changing the chosen spot) re-centers and re-pins it.
  const [focus, setFocus] = useState<{ lat: number; lng: number; label: string } | null>(null);
  const targetKey = `${target.lat.toFixed(5)}:${target.lng.toFixed(5)}:${target.label}`;
  useEffect(() => {
    if (search.view === "map") setView("map");
  }, [search.view]);
  useEffect(() => {
    if (view !== "map") return;
    setFocus({ ...target, label: target.label });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, targetKey]);

  const eventsGroup = discoveryGroupBySlug("events");
  const { places: eventPlaces, loading: eventsLoading } = usePlaceList(eventsGroup, null, area, {
    maxResults: 20,
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
    <div className="discover-inter app-shell flex min-h-[calc(100vh-5rem)] flex-col pb-0! pt-safe">
      <RadarAlerts />

      <div className="relative flex flex-col items-center">
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1 && window.history.state?.idx > 0) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          aria-label="Go back"
          className="absolute left-0 top-0 inline-flex size-9 items-center justify-center rounded-full border border-signal/60 bg-surface text-signal shadow-md shadow-signal/20 transition-colors hover:border-signal hover:bg-signal hover:text-signal-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={() => {
            if (window.history.length > 1 && window.history.state?.idx > 0) {
              window.history.back();
            } else {
              window.location.href = "/";
            }
          }}
          aria-label="Close and go back"
          className="absolute right-0 top-0 inline-flex size-9 items-center justify-center rounded-full border-2 border-signal bg-surface text-signal shadow-md shadow-signal/30 transition-colors hover:bg-signal hover:text-signal-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
        <p className="inline-flex items-center gap-2 border border-signal/30 bg-signal/5 px-3 py-1 font-mono text-[0.6rem] font-bold uppercase tracking-[0.25em] text-signal">
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inset-0 animate-ping-slow rounded-full bg-signal motion-reduce:animate-none" />
            <span className="relative size-1.5 rounded-full bg-signal" />
          </span>
          Discover // your city
        </p>
        <h1 className="mt-3 max-w-full px-12 text-center text-2xl font-extrabold italic uppercase leading-[0.95] tracking-tighter text-signal drop-shadow-[0_0_22px_color-mix(in_oklab,var(--color-signal)_35%,transparent)] sm:text-3xl">
          Browse places
        </h1>
        <p className="mt-2 px-12 text-center text-sm text-muted-foreground">
          Pick a spot and ask for a <span className="font-bold text-signal">live</span> view.
        </p>
      </div>

      <div className="flex-1">
      <LocationSearchBar className="mt-4" hideBrowsingLine />

      <div className="mt-3 flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <AreaPicker compact />
        </div>
        <div className="flex shrink-0 items-center gap-1 rounded-xl border border-border bg-surface p-1">
          {(
            [
              { id: "grid", label: "Show categories", icon: LayoutGrid },
              { id: "map", label: "Show live map", icon: MapIcon },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setView(tab.id)}
              aria-pressed={view === tab.id}
              aria-label={tab.label}
              title={tab.label}
              className={cn(
                "grid size-8 place-items-center rounded-lg transition-colors",
                view === tab.id ? "bg-signal text-signal-foreground" : "text-muted-foreground",
              )}
            >
              <tab.icon className="size-4" aria-hidden />
            </button>
          ))}
        </div>
      </div>

      <Link
        to="/events"
        className="group mt-3 flex items-center justify-between gap-3 border-y border-home-line py-3 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
      >
        <span className="inline-flex min-w-0 items-center gap-2 text-[0.68rem] font-extrabold uppercase tracking-[0.2em] text-foreground/80 transition-colors group-hover:text-signal">
          <span className="relative flex size-1.5 shrink-0" aria-hidden>
            <span className="absolute inline-flex size-full animate-ping-slow rounded-full bg-signal motion-reduce:animate-none" />
            <span className="relative inline-flex size-1.5 rounded-full bg-signal" />
          </span>
          <span className="truncate">Trending feeds &amp; live events</span>
        </span>
        <span className="font-mono text-xs text-signal/70 transition-transform group-hover:translate-x-0.5" aria-hidden>&gt;&gt;</span>
      </Link>

      {view === "map" ? (
        <div className="mt-4 space-y-3">
          <div className="relative h-[22rem] overflow-hidden rounded-2xl border border-border sm:h-[30rem] lg:h-[38rem]">
            <SectionBoundary label="The map">
              <MapCanvas
                requests={requests}
                selectedId={selectedId}
                onSelect={setSelectedId}
                viewportStorageKey="onlooker:map:discover"
                focusPin={focus ? { ...focus, zoom: 15 } : null}
                centerTarget={focus ? { lat: focus.lat, lng: focus.lng, zoom: 15 } : null}
                showNativeMapTypeControl={false}
              />
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
                  <h2 className="flex items-center gap-2 text-lg font-extrabold italic uppercase tracking-tight text-foreground">
                    <Flame className="size-4 shrink-0 text-signal" aria-hidden /><span>Trending events &amp;{" "}
                    <span className="text-signal">live sports</span></span>
                  </h2>
                  <p className="text-xs text-foreground/90">
                    <span className="font-bold text-signal">{isWeekend ? "On this weekend" : "Coming up"}</span>{" "}
                    around <span className="font-bold text-signal">{area.label}</span>
                  </p>
                </div>
                <Link
                  to="/events"
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
                              identity={place.name}
                              identityNote={place.primaryType ?? area.label}
                              alt={`${place.name} venue`}
                            />
                          </div>
                          <div className="p-3">
                            <span className="line-clamp-2 text-sm font-bold">
                              <TwoToneName name={place.name} />
                            </span>
                            <span className="mt-1 block truncate text-[0.68rem] font-semibold text-signal">
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

          <div className="mt-5 grid grid-cols-2 gap-3 xl:grid-cols-3">
            {DISCOVERY_GROUPS.map((group) => (
              <Link
                key={group.slug}
                to="/discover/$group"
                params={{ group: group.slug }}
                className="group relative block aspect-[3/4] overflow-hidden rounded-2xl border border-border bg-surface transition-all hover:-translate-y-0.5 hover:border-signal/70 hover:shadow-[0_8px_24px_-8px_rgba(204,255,0,0.35)]"
              >
                <PlacePhoto
                  src={discoveryImage(group.slug)}
                  identity={group.name}
                  identityNote={group.short}
                  alt={`${group.name} near ${area.label}`}
                  className="absolute inset-0 size-full opacity-80 transition-opacity group-hover:opacity-100"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                <ChevronRight
                  className="absolute right-3 top-3 size-4 text-foreground/60 transition-colors group-hover:text-signal"
                  aria-hidden
                />
                <div className="absolute inset-x-0 bottom-0 p-3">
                  <p className="line-clamp-2 font-display text-sm leading-tight">
                    <TwoToneName name={group.name} />
                  </p>
                  <p className="mt-0.5 truncate text-[0.66rem] font-semibold text-signal">{group.tagline}</p>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}

      <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
        <p className="inline-flex items-center gap-2 text-base font-extrabold italic uppercase tracking-tight text-foreground">
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

    </div>
  );
}
