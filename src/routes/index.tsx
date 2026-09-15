import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MapPin, Plus, Radio, Search, X } from "lucide-react";
import { MapCanvas } from "@/components/MapCanvas";
import { BountyBottomSheet } from "@/components/BountyBottomSheet";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { RequestViewPinDialog } from "@/components/RequestViewPinDialog";
import { Button } from "@/components/ui/button";
import { distanceMiles, requestMapPosition, type LiveRequest, type MapPosition } from "@/lib/onlooker";
import { useBoosts } from "@/lib/boosts-store";
import { isClosed, useOnlooker } from "@/lib/onlooker-store";
import { refundExpiredBounties } from "@/lib/bounty-escrow";
import { saveMyLocation } from "@/lib/hunter-location";
import { namePin, type ViewPin } from "@/lib/request-a-view";

const MAP_CONTEXT_EVENT = "onlooker:set-map-context";

export const Route = createFileRoute("/")({
  validateSearch: (
    search: Record<string, unknown>,
  ): { b?: string | undefined; snap?: string | undefined } => ({
    b: typeof search["b"] === "string" ? search["b"] : undefined,
    snap: search["snap"] === "1" ? "1" : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Onlooker — Find a Live View Now" },
      {
        name: "description",
        content: "Search the live map, explore nearby bounties, or post a request for a real-time view.",
      },
      { property: "og:title", content: "Onlooker — Find a Live View Now" },
      {
        property: "og:description",
        content: "Find real-time views and fund live requests from anywhere.",
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
  const { boostOf } = useBoosts();
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [pinMode, setPinMode] = useState(false);
  const [draftPin, setDraftPin] = useState<MapPosition | null>(null);
  const [pin, setPin] = useState<ViewPin | null>(null);
  const [naming, setNaming] = useState(false);
  const [centerTarget, setCenterTarget] = useState<(MapPosition & { zoom?: number }) | null>(null);

  useEffect(() => {
    void refundExpiredBounties();
  }, []);

  useEffect(() => {
    if (!userPosition) return;
    void saveMyLocation(userPosition.lat, userPosition.lng);
  }, [userPosition]);

  useEffect(() => {
    if (b) select(b);
  }, [b, select]);

  useEffect(() => {
    const applyContext = (event: Event) => {
      const detail = (event as CustomEvent<MapPosition>).detail;
      if (typeof detail?.lat !== "number" || typeof detail?.lng !== "number") return;
      setCenterTarget({ ...detail, zoom: 14 });
      setUserPosition(detail);
    };
    window.addEventListener(MAP_CONTEXT_EVENT, applyContext);
    return () => window.removeEventListener(MAP_CONTEXT_EVENT, applyContext);
  }, []);

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

  const selected = requests.find((request) => request.id === selectedId) ?? null;
  const activeCount = useMemo(
    () => requests.filter((request) => request.status === "open" && !isClosed(request)).length,
    [requests],
  );
  const poolOf = useCallback((request: LiveRequest) => request.bounty + boostOf(request.id), [boostOf]);

  return (
    <main className="fixed inset-0 bg-map">
      <MapCanvas
        requests={requests}
        selectedId={selectedId}
        onSelect={select}
        onUserPositionChange={setUserPosition}
        pinMode={pinMode}
        onMapPin={dropPin}
        draftPin={draftPin}
        centerTarget={centerTarget}
      />

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)]">
        <div className="pointer-events-auto mx-auto max-w-lg rounded-2xl border border-border bg-surface/92 p-2 shadow-xl backdrop-blur-xl">
          <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-2 pb-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <img src="/icon-192.png" alt="Onlooker Live" className="size-8 shrink-0 rounded-lg object-cover" />
              <div className="min-w-0">
                <h1 className="truncate font-display text-base font-bold text-foreground">Onlooker</h1>
                <p className="flex items-center gap-1 text-[0.65rem] font-bold uppercase text-live">
                  <Radio className="size-3" /> {activeCount} live {activeCount === 1 ? "request" : "requests"}
                </p>
              </div>
            </div>
            <Link to="/profile" aria-label="Open profile" className="grid size-9 shrink-0 place-items-center rounded-xl bg-surface-raised text-sm font-bold text-signal">
              OL
            </Link>
          </div>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            {searchOpen ? (
              <div className="min-w-0">
                <PlaceSearchInput
                  autoFocus
                  placeholder="Find a View Now"
                  onPick={(place) => {
                    setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
                    setSearchOpen(false);
                  }}
                />
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => setSearchOpen(true)} className="h-12 min-w-0 justify-start rounded-xl border-border bg-background px-4 text-muted-foreground">
                <Search className="size-5 text-signal" /> <span className="truncate">Find a View Now</span>
              </Button>
            )}
            <Button asChild className="h-12 rounded-xl px-4 font-bold">
              <Link to="/post"><Plus className="size-5" /><span className="hidden min-[360px]:inline">Post a Bounty</span><span className="min-[360px]:hidden">Post</span></Link>
            </Button>
          </div>
        </div>
      </header>

      <Button
        type="button"
        size="icon"
        variant={pinMode ? "default" : "secondary"}
        onClick={() => {
          setPinMode((value) => !value);
          setDraftPin(null);
          setPin(null);
        }}
        aria-label={pinMode ? "Cancel pin drop" : "Drop a bounty pin anywhere"}
        title={pinMode ? "Cancel pin drop" : "Drop a bounty pin anywhere"}
        className="absolute bottom-28 right-4 z-30 size-14 rounded-2xl border border-border shadow-xl"
      >
        {pinMode ? <X className="size-5" /> : <MapPin className="size-5" />}
      </Button>

      {pinMode && (
        <p className="absolute bottom-28 left-4 right-20 z-30 rounded-xl border border-signal/40 bg-surface/95 px-4 py-3 text-sm font-semibold text-signal shadow-xl backdrop-blur">
          Tap the map to place your bounty.
        </p>
      )}

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
        distanceLabel={selected && userPosition ? `${distanceMiles(userPosition, requestMapPosition(selected)).toFixed(1)} mi away` : undefined}
        onClaim={claim}
        onClose={() => select(null)}
      />
    </main>
  );
}