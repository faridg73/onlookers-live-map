import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, LayoutGrid, Map as MapIcon, Radar, X } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { RadarAlerts } from "@/components/RadarAlerts";
import { VENUE_GROUPS, isVenueOnToday } from "@/lib/venues";
import { useOnlooker } from "@/lib/onlooker-store";
import { useRadar } from "@/hooks/use-radar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/discover/")({
  head: () => ({
    meta: [
      { title: "Browse Places — Onlooker Live Views" },
      {
        name: "description",
        content:
          "Browse traffic hotspots, nightlife strips, coastal lookouts, weekend markets and more, then request a live view from anywhere.",
      },
      { property: "og:title", content: "Browse Places — Onlooker Live Views" },
      {
        property: "og:description",
        content: "Pick a place category or open the live radar map and request a view nearby.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: DiscoverHome,
});

function DiscoverHome() {
  const { requests, claim } = useOnlooker();
  const { spots, remove } = useRadar();
  const [view, setView] = useState<"grid" | "map">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeIn = (keywords: string[]) =>
    requests.filter(
      (r) =>
        r.status === "open" &&
        keywords.some((k) => `${r.place} ${r.title}`.toLowerCase().includes(k)),
    ).length;

  const selected = requests.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <RadarAlerts />

      <h1 className="font-display text-3xl tracking-tight text-foreground">Browse places</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Start broad, drill down to the exact spot, then ask for a live view.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-2 rounded-2xl border border-border bg-surface p-1">
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
              view === tab.id
                ? "bg-signal text-signal-foreground"
                : "text-muted-foreground",
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
        <div className="mt-4 space-y-3">
          {VENUE_GROUPS.map((group) => {
            const venuesToday = group.venues.filter((v) => isVenueOnToday(v));
            if (venuesToday.length === 0) return null;
            const open = venuesToday.reduce((sum, v) => sum + activeIn(v.match), 0);
            const popUp = group.venues.some((v) => v.days);
            return (
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
                    {popUp ? `${venuesToday.length} on today` : `${venuesToday.length} places`}
                  </span>
                </div>
                <div className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg text-foreground">{group.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {group.tagline}
                      {open > 0 && <span className="text-signal"> · {open} live now</span>}
                    </p>
                  </div>
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </div>
              </Link>
            );
          })}
        </div>
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
