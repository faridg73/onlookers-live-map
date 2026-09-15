import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  CircleDollarSign,
  Map,
  Radio,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { BountyBottomSheet } from "@/components/BountyBottomSheet";
import { isGoldBounty } from "@/lib/bounty-tiers";
import { useBoosts } from "@/lib/boosts-store";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import { distanceMiles, requestMapPosition, type LiveRequest, type MapPosition } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { saveMyLocation } from "@/lib/hunter-location";

import { PlaceSearchInput } from "@/components/PlaceSearchInput";

export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { b?: string | undefined; snap?: string | undefined } => ({
    b: typeof search["b"] === "string" ? search["b"] : undefined,
    snap: search["snap"] === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Onlooker — Live views from people already there" },
      {
        name: "description",
        content:
          "See any place in real time. Post a bounty, and someone standing there sends back a live photo within minutes.",
      },
      { property: "og:title", content: "Onlooker — Live views from people already there" },
      {
        property: "og:description",
        content: "Post a bounty and get a live photo of any place from someone nearby.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: MapScreen,
});

function MapScreen() {
  const { requests, selectedId, select, claim } = useOnlooker();
  const navigate = useNavigate();
  const { b } = Route.useSearch();
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const [exploreOpen, setExploreOpen] = useState(false);
  const [mapFilter, setMapFilter] = useState<"all" | "live" | "nearby" | "high">("all");
  const [centerTarget, setCenterTarget] = useState<(MapPosition & { zoom?: number }) | null>(null);

  const { boostOf } = useBoosts();
  const { unit, radius, radiusMiles, formatDistance } = useDistanceUnit(userPosition);

  // Send expired, unfulfilled deposits back to their requesters.
  useEffect(() => {
    void refundExpiredBounties();
  }, []);

  // Remember where this person is so nearby bounty alerts can reach them.
  useEffect(() => {
    if (!userPosition) return;
    void saveMyLocation(userPosition.lat, userPosition.lng);
  }, [userPosition]);

  // Opening a shared bounty link lands straight on that pin.
  useEffect(() => {
    if (b) select(b);
  }, [b, select]);

  const poolOf = useCallback((request: LiveRequest) => request.bounty + boostOf(request.id), [boostOf]);

  // The Home sheet filters the live map immediately without changing the underlying request data.
  const visible = useMemo(
    () =>
      requests.filter((request) => {
        if (mapFilter === "all") return true;
        if (mapFilter === "high") return isGoldBounty(poolOf(request));
        if (mapFilter === "live") {
          return request.bountyType === "live_stream" && request.status === "claimed" && !isClosed(request);
        }
        if (!userPosition) return false;
        return distanceMiles(userPosition, requestMapPosition(request)) <= radiusMiles;
      }),
    [requests, mapFilter, poolOf, radiusMiles, userPosition],
  );

  const selected = requests.find((r) => r.id === selectedId) ?? null;
  const nearby = useMemo(() => {
    if (!userPosition) return [];
    return requests
      .filter((request) => request.status === "open" && !isClosed(request))
      .map((request) => ({
        request,
        distance: distanceMiles(userPosition, requestMapPosition(request)),
      }))
      .filter(({ distance }) => distance <= radiusMiles)
      .sort((a, b) => a.distance - b.distance || b.request.bounty - a.request.bounty);
  }, [requests, userPosition, radiusMiles]);
  return (
    <div className="fixed inset-0">
      <MapCanvas
        requests={visible}
        selectedId={selectedId}
        onSelect={select}
        onUserPositionChange={setUserPosition}
        centerTarget={centerTarget}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-3 rounded-lg border border-border bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-xl">
          <img
            src="/icon-192.png"
            alt="Onlooker Live logo"
            className="size-8 rounded-lg object-cover"
          />
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-base font-extrabold leading-none tracking-tight text-foreground">
              Onlooker
            </h1>
            <p className="mt-0.5 truncate text-[0.65rem] font-bold text-muted-foreground">
              Live eyes, anywhere
            </p>
          </div>
        </div>
        <div className="pointer-events-auto mx-auto mt-2 w-full max-w-lg">
          <div className="rounded-lg border border-border bg-surface/95 p-1 shadow-lg backdrop-blur-xl">
            <PlaceSearchInput
              onPick={(place) => {
                setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
              }}
            />
          </div>
        </div>
      </header>

      <section className="pointer-events-auto absolute inset-x-3 bottom-[6.5rem] z-30 mx-auto w-auto max-w-lg overflow-hidden rounded-lg border border-border bg-surface/95 shadow-2xl backdrop-blur-xl">
        <Button
          type="button"
          variant="ghost"
          onClick={() => setExploreOpen((open) => !open)}
          aria-expanded={exploreOpen}
          className="h-14 w-full justify-start rounded-none border-b border-border px-4 text-foreground hover:bg-surface-raised"
        >
          <Search className="size-5 text-signal" />
          <span className="min-w-0 flex-1 text-left text-sm font-extrabold">What would you like to see?</span>
          <ChevronDown className={`size-4 transition-transform duration-300 ${exploreOpen ? "rotate-180" : ""}`} />
        </Button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            exploreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 max-h-[min(46vh,22rem)] overflow-y-auto overscroll-contain">
            <div className="border-b border-border bg-surface-raised/80 px-3 pb-2.5 pt-3">
              <div className="flex flex-col gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMapFilter("all")}
                  className="flex h-auto min-h-12 w-full items-center gap-3 rounded-md border-border bg-background px-3 py-2.5 text-left text-sm font-bold text-foreground"
                >
                  <Map className="size-4 shrink-0 text-signal" />
                  <span className="flex-1 text-left">Local Bounty Map</span>
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-signal px-1 text-[0.6rem] font-extrabold leading-none text-background">
                    {visible.length}
                  </span>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigate({ to: "/community" })}
                  className="flex h-auto min-h-12 w-full items-center gap-3 rounded-md border-border bg-background px-3 py-2.5 text-left text-sm font-bold text-foreground"
                >
                  <Users className="size-4 shrink-0 text-signal" />
                  <span className="flex-1 text-left">Community Vibe</span>
                  <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => void navigate({ to: "/discover" })}
                  className="flex h-auto min-h-12 w-full items-center gap-3 rounded-md border-border bg-background px-3 py-2.5 text-left text-sm font-bold text-foreground"
                >
                  <BookOpen className="size-4 shrink-0 text-signal" />
                  <span className="flex-1 text-left">Learning &amp; Guides</span>
                  <ChevronDown className="size-4 -rotate-90 text-muted-foreground" />
                </Button>
              </div>
              <div className="mt-2 flex gap-1.5 overflow-x-auto" aria-label="Live map filters">
                {(
                  [
                    ["all", "All"],
                    ["live", "Live now"],
                    ["nearby", `Nearby ${nearby.length}`],
                    ["high", "High bounty"],
                  ] as const
                ).map(([key, label]) => (
                  <Button
                    key={key}
                    type="button"
                    size="sm"
                    variant="outline"
                    aria-pressed={mapFilter === key}
                    onClick={() => setMapFilter(key)}
                    className={`h-8 shrink-0 rounded-full border px-3 text-[0.68rem] font-extrabold transition-colors duration-150 ${
                      mapFilter === key
                        ? "border-signal bg-signal text-background shadow-[0_0_0_1px_var(--color-signal)]"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <p className="mt-1.5 text-[0.65rem] text-muted-foreground" aria-live="polite">
                {mapFilter === "nearby" && !userPosition
                  ? `Allow location access to see requests within ${radius} ${unit}.`
                  : `${visible.length} ${visible.length === 1 ? "request" : "requests"} shown live`}
              </p>
            </div>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={() => void navigate({ to: "/hunt" })}
          className="h-14 w-full justify-start rounded-none border-b border-border px-4 text-foreground hover:bg-surface-raised"
        >
          <Radio className="size-5 text-live" />
          <span className="flex-1 text-left text-sm font-extrabold">Live Stream</span>
          <Sparkles className="size-4 text-muted-foreground" />
        </Button>

        <Button
          type="button"
          onClick={() => void navigate({ to: "/post" })}
          className="h-14 w-full justify-start rounded-none bg-signal px-4 text-signal-foreground shadow-[0_-1px_0_0_var(--color-signal),0_0_24px_0_color-mix(in_oklab,var(--color-signal)_45%,transparent)] transition-colors hover:bg-signal/90"
        >
          <CircleDollarSign className="size-5" />
          <span className="flex-1 text-left text-sm font-extrabold uppercase tracking-[0.06em]">
            Post a Bounty
          </span>
          <span className="rounded-full bg-signal-foreground/15 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em]">
            Primary
          </span>
        </Button>
      </section>


      <BountyBottomSheet
        request={selected}
        pool={selected ? poolOf(selected) : 0}
        distanceLabel={
          selected && userPosition
            ? formatDistance(distanceMiles(userPosition, requestMapPosition(selected)))
            : undefined
        }
        onClaim={claim}
        onClose={() => select(null)}
      />
    </div>
  );
}
