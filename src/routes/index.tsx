import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  BadgeCheck,
  ChevronDown,
  CircleDollarSign,
  Compass,
  LockKeyhole,
  Map,
  Radio,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
  Video,
  X,
} from "lucide-react";
import { createPortal } from "react-dom";
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
      { title: "Onlooker, Live views from people already there" },
      {
        name: "description",
        content:
          "Onlooker connects live streaming with real-world accountability. Post a bounty, lock credits, and release them after verified proof.",
      },
      { property: "og:title", content: "Onlooker | Live proof backed by locked credits" },
      {
        property: "og:description",
        content: "Post a bounty, lock credits, and release them only after real-world proof is verified.",
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
  const [accountabilityOpen, setAccountabilityOpen] = useState(false);
  const [mapFilter, setMapFilter] = useState<"all" | "live" | "nearby" | "high">("all");
  const [centerTarget, setCenterTarget] = useState<(MapPosition & { zoom?: number }) | null>(null);
  const [guidesOpen, setGuidesOpen] = useState(false);

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

      <header className="pointer-events-none absolute inset-x-0 top-0 z-30 px-4 pt-[calc(env(safe-area-inset-top)+0.75rem)] md:px-6">
        <div className="pointer-events-auto ml-auto flex w-fit flex-col items-center gap-1 rounded-xl border border-border bg-surface/95 px-2.5 py-2 shadow-lg backdrop-blur-xl md:px-3 md:py-2.5 md:shadow-2xl">
          <img
            src="/icon-192.png"
            alt="Onlooker LLC logo"
            className="size-10 rounded-lg object-cover md:size-12"
          />
          <h1 className="text-xs font-extrabold leading-none tracking-tight text-foreground md:text-sm">
            Onlooker
          </h1>
          <p className="whitespace-nowrap text-[0.55rem] font-bold leading-none text-muted-foreground md:text-[0.6rem]">
            Live eyes, anywhere
          </p>
        </div>
        {/* Mobile: floating search pill that expands only when tapped, so the
            map and pins stay fully visible. Desktop keeps the always-open box. */}
        <div className="pointer-events-auto absolute left-3 top-[calc(env(safe-area-inset-top)+0.75rem)] md:fixed md:bottom-[7.25rem] md:left-auto md:right-6 md:top-auto md:w-80">
          {searchOpen ? (
            <div className="flex w-[min(20rem,calc(100vw-6.5rem))] items-start gap-1.5 md:w-80">
              <div className="min-w-0 flex-1 rounded-lg border border-border bg-surface/95 p-1 shadow-lg backdrop-blur-xl md:rounded-xl md:p-1.5 md:shadow-2xl">
                <PlaceSearchInput
                  autoFocus
                  onPick={(place) => {
                    setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
                    setSearchOpen(false);
                  }}
                />
              </div>
              <button
                type="button"
                aria-label="Close search"
                onClick={() => setSearchOpen(false)}
                className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-surface/95 text-foreground shadow-lg backdrop-blur-xl md:hidden"
              >
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              aria-label="Search for a place"
              onClick={() => setSearchOpen(true)}
              className="grid size-11 place-items-center rounded-full border border-border bg-surface/95 text-signal shadow-lg backdrop-blur-xl md:hidden"
            >
              <Search className="size-5" />
            </button>
          )}
          {/* Desktop always-open search box */}
          <div className="hidden rounded-xl border border-border bg-surface/95 p-1.5 shadow-2xl backdrop-blur-xl md:block">
            <PlaceSearchInput
              onPick={(place) => {
                setCenterTarget({ lat: place.latitude, lng: place.longitude, zoom: 15 });
              }}
            />
          </div>
        </div>
      </header>

      <div className="pointer-events-auto absolute inset-x-3 bottom-[6.5rem] z-40 mx-auto flex w-auto max-w-lg flex-col gap-2">
        <section className="overflow-hidden rounded-lg border border-border bg-surface/95 shadow-2xl backdrop-blur-xl">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setAccountabilityOpen((open) => !open);
              setExploreOpen(false);
            }}
            aria-expanded={accountabilityOpen}
            className="h-auto min-h-12 w-full justify-start rounded-none px-4 py-2.5 text-foreground hover:bg-surface-raised"
          >
            <ShieldCheck className="size-5 text-signal" />
            <span className="min-w-0 flex-1 text-left">
              <span className="block text-xs font-extrabold uppercase tracking-[0.1em] text-signal">
                Real-world accountability
              </span>
              <span className="block truncate text-[0.68rem] text-muted-foreground">
                Bounties backed by locked credits and verified proof
              </span>
            </span>
            <ChevronDown className={`size-4 transition-transform duration-300 ${accountabilityOpen ? "rotate-180" : ""}`} />
          </Button>
          <div
            className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
              accountabilityOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="grid grid-cols-3 border-t border-border bg-surface-raised/80 px-3 py-3">
                {[
                  { icon: CircleDollarSign, label: "Post", text: "Set a real request" },
                  { icon: LockKeyhole, label: "Lock", text: "Credits stay protected" },
                  { icon: BadgeCheck, label: "Verify", text: "Release after proof" },
                ].map(({ icon: Icon, label, text }, index) => (
                  <div key={label} className={`px-2 ${index > 0 ? "border-l border-border" : ""}`}>
                    <Icon className="size-4 text-signal" aria-hidden />
                    <p className="mt-1 text-xs font-extrabold text-foreground">{label}</p>
                    <p className="mt-0.5 text-[0.62rem] leading-snug text-muted-foreground">{text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-lg border border-border bg-surface/95 shadow-2xl backdrop-blur-xl">
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setExploreOpen((open) => !open);
            setAccountabilityOpen(false);
          }}
          aria-expanded={exploreOpen}
          className="h-14 w-full justify-start rounded-none border-b border-border px-4 text-foreground hover:bg-surface-raised"
        >
          <Search className="size-5 text-signal md:size-6" />
          <span className="min-w-0 flex-1 text-left text-sm font-extrabold md:text-base">What would you like to see?</span>
          <ChevronDown className={`size-4 transition-transform duration-300 md:size-5 ${exploreOpen ? "rotate-180" : ""}`} />
        </Button>

        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
            exploreOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
          }`}
        >
          <div className="min-h-0 max-h-[min(38vh,17rem)] overflow-y-auto overscroll-contain">
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
                  onClick={() => setGuidesOpen(true)}
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
      </div>


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

      <GuidesOverlay open={guidesOpen} onClose={() => setGuidesOpen(false)} />
    </div>
  );
}

const GUIDES: Array<{
  icon: typeof Compass;
  kicker: string;
  title: string;
  body: string;
  points: string[];
}> = [
  {
    icon: Compass,
    kicker: "Platform guide",
    title: "How Onlooker works",
    body: "Ever wished you could see a place right now? Someone out there is already standing in it. That's the whole idea.",
    points: [
      "Post a bounty, pick the spot and say what you'd love to see.",
      "Your credits stay safely held until your capture actually arrives.",
      "Every pin on the map is a real request from a real person, right now.",
    ],
  },
  {
    icon: Sparkles,
    kicker: "Hunter onboarding",
    title: "Earn your first bounty",
    body: "See a request near you? Claim it, film a quick live capture, and the money lands the moment it's accepted.",
    points: [
      "Verify your phone first, it shows people you're a real human.",
      "Only claim what you can genuinely reach in time. No rushing needed.",
      "A clear, steady capture builds trust, and brings repeat requests.",
    ],
  },
  {
    icon: Video,
    kicker: "Live streaming",
    title: "Streaming people stick around for",
    body: "Nobody expects a film crew. Steady hands, decent light and a little chatter go a surprisingly long way.",
    points: [
      "Hold your phone with both hands and pan slowly, let people take the scene in.",
      "Say where you are out loud; it helps everyone find their bearings.",
      "Answer the chat. That's the fun part, and it's exactly what viewers are here for.",
    ],
  },
  {
    icon: ShieldCheck,
    kicker: "Safety",
    title: "Stay safe out there",
    body: "Public places only, always. No bounty is ever worth putting yourself, or anyone else, in a tricky spot.",
    points: [
      "Skip private homes, gated property and anywhere you're not meant to be.",
      "Leave live shows, performances and games alone, that's someone else's work.",
      "Keep chats and payments on Onlooker. It's how we've got your back.",
    ],
  },
];

function GuidesOverlay({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-end justify-center">
      <button
        type="button"
        aria-label="Close guides"
        onClick={onClose}
        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="guides-title"
        className="relative flex max-h-[85vh] w-full max-w-lg animate-in slide-in-from-bottom-8 flex-col overflow-hidden rounded-t-2xl border border-border bg-surface shadow-2xl duration-300"
      >
        <div className="flex items-start gap-3 border-b border-border px-4 py-3.5">
          <BookOpen className="mt-0.5 size-5 shrink-0 text-signal" />
          <div className="min-w-0 flex-1">
            <h2 id="guides-title" className="text-base font-extrabold text-foreground">
              Learning &amp; Guides
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              A few friendly pointers to help you get the most out of Onlooker.
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label="Close guides"
            className="size-8 shrink-0 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </Button>
        </div>

        <div className="min-h-0 max-h-[calc(85vh-4.5rem)] flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pt-4 [-webkit-overflow-scrolling:touch] pb-[calc(env(safe-area-inset-bottom)+3rem)]">
          {GUIDES.map(({ icon: Icon, kicker, title, body, points }) => (
            <article key={title} className="rounded-xl border border-border bg-surface-raised/70 p-4">
              <p className="flex items-center gap-2 text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-signal">
                <Icon className="size-3.5" /> {kicker}
              </p>
              <h3 className="mt-1.5 text-sm font-extrabold text-foreground">{title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{body}</p>
              <ul className="mt-2.5 space-y-1.5">
                {points.map((point) => (
                  <li key={point} className="flex gap-2 text-xs text-foreground/85">
                    <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-signal" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
