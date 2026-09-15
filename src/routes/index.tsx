import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ChevronDown, CoinsIcon, Layers, MapPin, Navigation } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { LivePulseBadge } from "@/components/LivePulseBadge";
import { BountyBottomSheet } from "@/components/BountyBottomSheet";
import { FlashBountyButton } from "@/components/FlashBountyButton";
import { isGoldBounty } from "@/lib/bounty-tiers";
import { useBoosts } from "@/lib/boosts-store";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import { distanceMiles, requestMapPosition, type LiveRequest, type MapPosition } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { saveMyLocation } from "@/lib/hunter-location";

import { Globe2, X } from "lucide-react";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { TrendingViewRequests } from "@/components/TrendingViewRequests";
import { namePin, type ViewPin } from "@/lib/request-a-view";
import { RequestViewPinDialog } from "@/components/RequestViewPinDialog";

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
  // "Request a view": drop a pin anywhere in the world and fund a live stream.
  const [pinMode, setPinMode] = useState(false);
  const [draftPin, setDraftPin] = useState<MapPosition | null>(null);
  const [pin, setPin] = useState<ViewPin | null>(null);
  const [naming, setNaming] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [centerTarget, setCenterTarget] = useState<(MapPosition & { zoom?: number }) | null>(null);

  const dropPin = useCallback((position: MapPosition) => {
    setDraftPin(position);
    setNaming(true);
    select(null);
    void namePin(position.lat, position.lng)
      .then(setPin)
      .catch(() =>
        setPin({
          latitude: position.lat,
          longitude: position.lng,
          formatted: `Pin at ${position.lat.toFixed(4)}, ${position.lng.toFixed(4)}`,
        }),
      )
      .finally(() => setNaming(false));
  }, [select]);


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
        pinMode={pinMode}
        onMapPin={dropPin}
        draftPin={draftPin}
        centerTarget={centerTarget}
      />


      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        {/* Clean top bar: brand, nearby status, filter + nearby toggles */}
        <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-2 rounded-xl border border-border bg-surface/95 px-3 py-2 shadow-lg backdrop-blur-xl">
          <img
            src="/icon-192.png"
            alt="Onlooker Live logo"
            className="size-8 rounded-lg object-cover"
          />
          <button
            type="button"
            onClick={() => setNearbyOpen((open) => !open)}
            aria-expanded={nearbyOpen}
            className="min-w-0 flex-1 text-left"
          >
            <h1 className="font-display text-base font-extrabold leading-none tracking-tight text-foreground">
              Onlooker
            </h1>
            <p className="mt-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-live">
              {nearbyLabel}
            </p>
          </button>
          <button
            type="button"
            onClick={() => setGoldOnly((g) => !g)}
            aria-pressed={goldOnly}
            aria-label={goldOnly ? "Show all bounties" : "Show high bounties only"}
            className="rounded-lg border border-border p-2 transition-colors hover:bg-surface-raised"
            style={
              goldOnly
                ? {
                    backgroundColor: "var(--pin-gold)",
                    borderColor: "var(--pin-gold)",
                    color: "oklch(0.24 0.05 92)",
                  }
                : { color: "var(--pin-gold)" }
            }
          >
            <CoinsIcon className="size-4" />
          </button>
          <button
            type="button"
            onClick={() => setNearbyOpen((open) => !open)}
            aria-expanded={nearbyOpen}
            aria-label="Toggle nearby requests"
            className="rounded-lg border border-border p-2 text-signal transition-colors hover:bg-surface-raised"
          >
            <ChevronDown className={`size-4 transition-transform ${nearbyOpen ? "rotate-180" : ""}`} />
          </button>
        </div>

        {nearbyOpen && (
          <section className="pointer-events-auto mx-auto mt-2 max-h-[min(52dvh,28rem)] w-full max-w-lg overflow-y-auto overscroll-contain rounded-xl border border-border bg-surface/95 p-2 shadow-lg backdrop-blur-xl">
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
                      className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-left"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-bold text-foreground">{request.title}</span>
                        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                          <MapPin className="size-3 shrink-0" />
                          <span className="truncate">{request.place}</span>
                        </span>
                        <span className="mt-0.5 block text-xs font-bold text-signal">
                          {formatDistance(distance)} away
                        </span>
                      </span>
                      <span className="shrink-0 text-right">
                        <span className="block font-display text-base font-extrabold text-signal">
                          {request.bounty} cr
                        </span>
                        <span className="flex items-center justify-end gap-1 text-[0.65rem] text-muted-foreground">
                          <Navigation className="size-3" /> {formatDistance(distance)}
                        </span>
                      </span>
                    </button>
                    <BountyDetailsDialog request={request} onClaim={claim} userPosition={userPosition}>
                      <Button type="button" variant="outline" className="mt-2 h-9 w-full rounded-lg text-xs font-bold">
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

        {/* Streamlined search with trending suggestions */}
        <div className="pointer-events-auto mx-auto mt-2 w-full max-w-lg">
          <div className="rounded-xl bg-surface/95 p-1 shadow-lg backdrop-blur-xl">
            <PlaceSearchInput
              onQueryChange={setSearchText}
              onPick={(place) => {
                setSearchText("");
                setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
              }}
            />
          </div>
          {searchText.trim().length === 0 && (
            <TrendingViewRequests
              className="mt-2"
              onOpen={(request) => {
                select(request.id);
                if (typeof request.lat === "number" && typeof request.lng === "number") {
                  setCenterTarget({ lat: request.lat, lng: request.lng, zoom: 14 });
                }
              }}
            />
          )}
        </div>

        {pinMode && (
          <p className="pointer-events-auto mx-auto mt-2 w-full max-w-lg rounded-xl border border-signal/40 bg-surface/95 px-3 py-2 text-center text-[0.7rem] font-bold uppercase tracking-[0.1em] text-signal shadow-lg backdrop-blur-xl">
            Tap anywhere on the map to drop your pin
          </p>
        )}
      </header>

      {/* Floating "Request a view anywhere" action */}
      <button
        type="button"
        onClick={() => {
          setPinMode((on) => !on);
          setDraftPin(null);
          setPin(null);
        }}
        aria-pressed={pinMode}
        className="pointer-events-auto absolute bottom-28 left-4 z-30 flex flex-col items-center gap-1"
      >
        <span
          className={`grid size-14 place-items-center rounded-full border-2 shadow-xl backdrop-blur-xl transition-transform active:scale-95 ${
            pinMode
              ? "border-signal bg-signal text-signal-foreground"
              : "border-border bg-surface/95 text-cyan drop-shadow-[0_0_10px_var(--cyan-glow)]"
          }`}
        >
          {pinMode ? <X className="size-5" /> : <Globe2 className="size-5" />}
        </span>
        <span className="rounded-full bg-surface/90 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-cyan backdrop-blur">
          {pinMode ? "Cancel" : "Request"}
        </span>
      </button>

      <FlashBountyButton variant="map" />

      <RequestViewPinDialog
        pin={pin}
        naming={naming}
        onClose={() => {
          setPin(null);
          setNaming(false);
          setDraftPin(null);
          setPinMode(false);
        }}
      />


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
