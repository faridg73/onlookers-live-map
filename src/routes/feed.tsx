import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { useOnlooker } from "@/lib/onlooker-store";
import {
  CATEGORIES,
  distanceMiles,
  requestMapPosition,
  type CategoryId,
  type MapPosition,
  type RequestStatus,
} from "@/lib/onlooker";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { requestCurrentPosition } from "@/lib/geolocation";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Live Requests Feed — Onlooker" },
      {
        name: "description",
        content:
          "Every open live photo request near you, ranked by bounty and time left. Claim one and shoot it.",
      },
      { property: "og:title", content: "Live Requests Feed — Onlooker" },
      {
        property: "og:description",
        content: "Open live photo requests near you, ranked by bounty and time left.",
      },
    ],
  }),
  component: FeedScreen,
});

const FILTERS: Array<{ key: RequestStatus | "all"; label: string }> = [
  { key: "all", label: "All" },
  { key: "open", label: "Open" },
  { key: "claimed", label: "Claimed" },
  { key: "fulfilled", label: "Done" },
  { key: "expired", label: "Expired" },
];

function FeedScreen() {
  const { requests, claim } = useOnlooker();
  const [filter, setFilter] = useState<RequestStatus | "all">("all");
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [sub, setSub] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const { unit, radius, formatDistance } = useDistanceUnit(userPosition);

  const [locationError, setLocationError] = useState<string | null>(null);

  const locate = async () => {
    setLocationError(null);
    try {
      const { coords } = await requestCurrentPosition();
      setUserPosition({ lat: coords.latitude, lng: coords.longitude });
    } catch (error) {
      setLocationError(error instanceof Error ? error.message : "Location is unavailable.");
    }
  };

  useEffect(() => {
    locate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Closest bounties first (like Google Local results); unknown distances go last.
  // Category tiles, sub-options and typed keyword all filter in real time.
  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const subOption = cat === "all" ? undefined : subOptionById(cat, sub);
    const filtered = requests.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      const catLabel = (CATEGORIES.find((c) => c.id === r.category)?.label ?? "").toLowerCase();
      const haystack = `${r.title} ${r.place} ${r.note} ${r.instructions ?? ""} ${r.category ?? ""} ${catLabel}`.toLowerCase();
      if (cat !== "all") {
        // A sub-option may point at its own stored category (Events → Sports).
        const wanted = subOption?.category ?? cat;
        if (r.category !== wanted) return false;
        if (subOption && !subOption.category && !haystack.includes(subOption.label.toLowerCase())) {
          return false;
        }
      }
      if (q && !haystack.includes(q)) return false;
      return true;
    });
    if (!userPosition) return filtered;
    const from = userPosition;
    return [...filtered].sort(
      (a, b) =>
        distanceMiles(from, requestMapPosition(a)) - distanceMiles(from, requestMapPosition(b)),
    );
  }, [requests, filter, cat, query, userPosition]);

  const distanceLabel = (r: (typeof requests)[number]) =>
    userPosition ? formatDistance(distanceMiles(userPosition, requestMapPosition(r))) : undefined;
  const pot = requests.filter((r) => r.status === "open").reduce((s, r) => s + r.bounty, 0);

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <h1 className="font-display text-3xl tracking-tight text-foreground">Live requests</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        <span className="text-signal">${pot}</span> in open bounties within {radius} {unit} of you.
      </p>

      {!userPosition && (
        <button
          type="button"
          onClick={locate}
          className="mt-3 w-full rounded-lg border border-signal bg-surface px-3 py-2 text-xs font-bold text-signal"
        >
          {locationError ? "Retry location" : "Turn on location to show distances"}
        </button>
      )}
      {locationError && !userPosition && (
        <p className="mt-2 text-xs text-muted-foreground" role="status">
          {locationError}
        </p>
      )}

      <p className="mt-5 text-[0.68rem] font-bold uppercase text-muted-foreground">
        What do you want to see?
      </p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[{ id: "all" as const, label: "All types", emoji: "" }, ...CATEGORIES].map((c) => (
          <button
            key={c.id}
            onClick={() => setCat(c.id)}
            className={
              "min-w-0 rounded-lg border px-1.5 py-2 text-[0.68rem] font-semibold leading-tight transition-colors " +
              (cat === c.id
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground")
            }
          >
            <span className="flex min-h-8 items-center justify-center gap-1 text-center">
              {c.emoji && <span className="shrink-0">{c.emoji}</span>}
              <span>{c.id === "all" ? c.label : SHORT_CATEGORY_LABELS[c.id]}</span>
            </span>
          </button>
        ))}
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by keyword, place, or type..."
          aria-label="Search bounties"
          className="h-10 w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="shrink-0 text-xs font-bold text-muted-foreground hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-4 text-[0.68rem] font-bold uppercase text-muted-foreground">Status</p>
      <div className="mt-2 grid grid-cols-5 gap-1.5">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={
              "min-w-0 rounded-lg border px-1 py-2 text-[0.66rem] font-bold uppercase transition-colors " +
              (filter === f.key
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface text-muted-foreground hover:text-foreground")
            }
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="mt-5 space-y-3">
        {list.map((r) => (
          <BountyDetailsDialog key={r.id} request={r} onClaim={claim}>
            <RequestCard request={r} compact distanceLabel={distanceLabel(r)} />
          </BountyDetailsDialog>
        ))}
        {list.length === 0 && (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Nothing here yet.
          </p>
        )}
      </div>
    </div>
  );
}
