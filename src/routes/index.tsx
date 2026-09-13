import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Camera, ChevronDown, CoinsIcon, Layers, MapPin, Navigation } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { NewRequestDialog } from "@/components/NewRequestDialog";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { BountyBottomSheet } from "@/components/BountyBottomSheet";
import { isGoldBounty } from "@/lib/bounty-tiers";
import { useBoosts } from "@/lib/boosts-store";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import { distanceMiles, requestMapPosition, type LiveRequest, type MapPosition } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { saveMyLocation } from "@/lib/hunter-location";

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
  const { b, snap } = Route.useSearch();
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const [nearbyOpen, setNearbyOpen] = useState(false);
  const [goldOnly, setGoldOnly] = useState(false);
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

  // "High Bounties Only" hides everything but the pulsing 50+ credit gold pins.
  const visible = useMemo(
    () => (goldOnly ? requests.filter((request) => isGoldBounty(poolOf(request))) : requests),
    [requests, goldOnly, poolOf],
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
  const nearbyLabel = userPosition
    ? `${nearby.length} live ${nearby.length === 1 ? "request" : "requests"} within ${radius} ${unit}`
    : "Turn on location to find nearby requests";

  return (
    <div className="fixed inset-0">
      <MapCanvas
        requests={visible}
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
          <img
            src="/icon-192.png"
            alt="Onlooker Live logo"
            className="size-9 rounded-lg object-cover"
          />
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
                    <BountyDetailsDialog request={request} onClaim={claim} userPosition={userPosition}>
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

        {/* sticky filter dock */}
        <div className="pointer-events-auto mx-auto mt-2 grid w-full max-w-lg grid-cols-2 gap-2 rounded-lg border border-border bg-surface/95 p-1.5 shadow-lg backdrop-blur-xl">
          <button
            type="button"
            onClick={() => setGoldOnly(false)}
            aria-pressed={!goldOnly}
            className={`flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] transition-colors ${
              goldOnly ? "text-muted-foreground" : "bg-surface-raised text-foreground"
            }`}
          >
            <Layers className="size-3.5" /> All Views
          </button>
          <button
            type="button"
            onClick={() => setGoldOnly(true)}
            aria-pressed={goldOnly}
            className="flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-xs font-extrabold uppercase tracking-[0.1em] transition-colors"
            style={
              goldOnly
                ? { backgroundColor: "var(--pin-gold)", color: "oklch(0.24 0.05 92)" }
                : { color: "var(--pin-gold)" }
            }
          >
            <CoinsIcon className="size-3.5" /> High Bounties
          </button>
        </div>
      </header>

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
