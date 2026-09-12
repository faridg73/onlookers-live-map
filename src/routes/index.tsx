import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, MapPin, Navigation, Zap } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { RequestCard } from "@/components/RequestCard";
import { NewRequestDialog } from "@/components/NewRequestDialog";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import { distanceMiles, requestMapPosition, type MapPosition } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";
import { useDistanceUnit } from "@/hooks/use-distance-unit";

export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>): { b?: string | undefined } => ({
    b: typeof search["b"] === "string" ? search["b"] : undefined,
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
  const { b } = Route.useSearch();
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const { unit, radius, radiusMiles, formatDistance } = useDistanceUnit(userPosition);

  // Send expired, unfulfilled deposits back to their requesters.
  useEffect(() => {
    void refundExpiredBounties();
  }, []);

  // Opening a shared bounty link lands straight on that pin.
  useEffect(() => {
    if (b) select(b);
  }, [b, select]);

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
  const nearbyLabel = userPosition
    ? `${nearby.length} live ${nearby.length === 1 ? "request" : "requests"} within ${radius} ${unit}`
    : "Turn on location to find nearby requests";

  return (
    <div className="fixed inset-0">
      <MapCanvas
        requests={requests}
        selectedId={selectedId}
        onSelect={select}
        onUserPositionChange={setUserPosition}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <button
          type="button"
          onClick={() => setNearbyOpen((open) => !open)}
          aria-expanded={nearbyOpen}
          className="pointer-events-auto mx-auto grid w-full max-w-lg grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-border bg-surface/95 px-4 py-3 text-left shadow-lg backdrop-blur-xl"
        >
          <span className="flex size-8 items-center justify-center rounded-lg bg-signal text-signal-foreground">
            <Zap className="size-4" strokeWidth={2.4} />
          </span>
          <div className="min-w-0 flex-1">
            <h1 className="font-display text-lg font-extrabold leading-none tracking-tight text-foreground">
              Onlooker
            </h1>
            <p className="mt-1 text-[0.7rem] font-extrabold uppercase tracking-[0.16em] text-live">
              {nearbyLabel}
            </p>
          </div>
          <ChevronDown className={`size-5 shrink-0 text-signal transition-transform ${nearbyOpen ? "rotate-180" : ""}`} />
        </button>

        {nearbyOpen && (
          <section className="pointer-events-auto mx-auto mt-2 max-h-[min(52dvh,28rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-lg border border-border bg-surface/95 p-2 shadow-lg backdrop-blur-xl">
            {nearby.length > 0 ? (
              <ul className="space-y-2">
                {nearby.map(({ request, distance }) => (
                  <li key={request.id} className="rounded-lg border border-border bg-surface-raised p-3">
                    <button
                      type="button"
                      onClick={() => {
                        select(request.id);
                        setNearbyOpen(false);
                      }}
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{request.place}</span>
                        </span>
                        <span className="mt-0.5 block text-xs font-bold text-signal">
                          {formatDistance(distance)} away
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-lg font-extrabold text-signal">${request.bounty}</span>
                        <span className="flex items-center justify-end gap-1 text-[0.68rem] text-muted-foreground">
                          <Navigation className="size-3" /> {formatDistance(distance)}
                        </span>
                      </span>
                    </button>
                    <BountyDetailsDialog request={request} onClaim={claim}>
                      <Button type="button" variant="outline" className="mt-3 h-10 w-full rounded-lg font-bold">
                        View details
                      </Button>
                    </BountyDetailsDialog>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                {userPosition
                  ? `No active bounties are currently available within ${radius} ${unit}.`
                  : `Allow location access to see available bounties within ${radius} ${unit}.`}
              </p>
            )}
          </section>
        )}
      </header>

      {selected && (
        <div className="absolute inset-x-0 bottom-[5.75rem] z-30 px-4">
          <div className="mx-auto max-w-lg animate-rise">
            <BountyDetailsDialog request={selected} onClaim={claim}>
              <div role="button" tabIndex={0}>
                <RequestCard
                  request={selected}
                  active
                  distanceLabel={
                    userPosition
                      ? formatDistance(distanceMiles(userPosition, requestMapPosition(selected)))
                      : undefined
                  }
                />
              </div>
            </BountyDetailsDialog>
          </div>
        </div>
      )}

      <NewRequestDialog>
        <button
          className="absolute bottom-[6.25rem] right-4 z-30 flex size-14 items-center justify-center rounded-2xl bg-signal text-signal-foreground shadow-[0_14px_40px_-10px_oklch(0.78_0.17_82/0.7)] transition-transform active:scale-95"
          aria-label="Create a new live photo request"
        >
          <Camera className="size-6" strokeWidth={2} />
        </button>
      </NewRequestDialog>
    </div>
  );
}
