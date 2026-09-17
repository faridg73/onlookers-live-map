import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { TrendingViewRequests } from "@/components/TrendingViewRequests";
import { useEffect, useMemo, useState } from "react";
import { Search } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { BountyDetailsDialog } from "@/components/BountyDetailsDialog";
import { CategoryPicker, type CategoryPickerValue } from "@/components/CategoryPicker";
import { RecentCapturesFeed } from "@/components/RecentCapturesFeed";
import { useOnlooker } from "@/lib/onlooker-store";
import {
  CATEGORIES,
  distanceMiles,
  requestMapPosition,
  subOptionById,
  type CategoryId,
  type MapPosition,
  type RequestStatus,
} from "@/lib/onlooker";
import { useDistanceUnit } from "@/hooks/use-distance-unit";
import { requestCurrentPosition } from "@/lib/geolocation";

export const Route = createFileRoute("/feed")({
  head: () => ({
    meta: [
      { title: "Live Requests Feed | Onlooker" },
      {
        name: "description",
        content:
          "Every open live photo request near you, ranked by bounty and time left. Claim one and shoot it.",
      },
      { property: "og:title", content: "Live Requests Feed | Onlooker" },
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

const PRESETS_MILES = [5, 15, 25] as const;
const DEFAULT_CUSTOM_MILES = 100;

type RadiusChoice = number | "custom";

function FeedScreen() {
  const { requests, claim } = useOnlooker();
  const [filter, setFilter] = useState<RequestStatus | "all">("open");
  const [radiusChoice, setRadiusChoice] = useState<RadiusChoice>(PRESETS_MILES[0]);
  const [customMiles, setCustomMiles] = useState(DEFAULT_CUSTOM_MILES);
  const [cat, setCat] = useState<CategoryId | "all">("all");
  const [sub, setSub] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const navigate = useNavigate();
  const [placeQuery, setPlaceQuery] = useState("");
  // A place picked from the search dropdown re-centres the feed's radius filter.
  const [area, setArea] = useState<{ label: string; lat: number; lng: number } | null>(null);
  const [userPosition, setUserPosition] = useState<MapPosition | null>(null);
  const { unit, formatDistance } = useDistanceUnit(userPosition);

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

  // Radius choices are offered in the viewer's own unit; we always filter in miles.
  const radiusOptions = useMemo(
    () =>
      unit === "mi"
        ? [
            { label: "5 mi", miles: 5 },
            { label: "15 mi", miles: 15 },
            { label: "25 mi", miles: 25 },
          ]
        : [
            { label: "10 km", miles: 10 / 1.609344 },
            { label: "25 km", miles: 25 / 1.609344 },
            { label: "50 km", miles: 50 / 1.609344 },
          ],
    [unit],
  );

  useEffect(() => {
    setRadiusChoice((current) =>
      current === "custom" || radiusOptions.some((o) => o.miles === current)
        ? current
        : (radiusOptions[0]?.miles ?? PRESETS_MILES[0]),
    );
  }, [radiusOptions]);

  const effectiveRadiusMiles =
    radiusChoice === "custom" ? customMiles : radiusChoice;

  const radiusLabel =
    radiusChoice === "custom"
      ? `${Math.round(unit === "mi" ? customMiles : customMiles * 1.609344)} ${unit}`
      : (radiusOptions.find((o) => o.miles === radiusChoice)?.label ?? `${radiusChoice} ${unit}`);

  const nextWiderRadius: RadiusChoice = useMemo(() => {
    if (radiusChoice === "custom") return "custom";
    const next = radiusOptions.find((o) => o.miles > radiusChoice)?.miles;
    return next ?? "custom";
  }, [radiusChoice, radiusOptions]);

  // Distances are measured from the searched area when one is chosen, otherwise
  // from the viewer's own position.
  const center: MapPosition | null = area ? { lat: area.lat, lng: area.lng } : userPosition;

  const withinRadius = (r: (typeof requests)[number]) => {
    if (!center) return true;
    return distanceMiles(center, requestMapPosition(r)) <= effectiveRadiusMiles;
  };

  // Status, keyword and radius filters shared by both the list and the tile counters.
  const inScope = useMemo(() => {
    const q = query.trim().toLowerCase();
    return requests.filter((r) => {
      if (filter !== "all" && r.status !== filter) return false;
      if (!withinRadius(r)) return false;
      if (!q) return true;
      const catLabel = (CATEGORIES.find((c) => c.id === r.category)?.label ?? "").toLowerCase();
      return `${r.title} ${r.place} ${r.note} ${r.instructions ?? ""} ${r.category ?? ""} ${catLabel}`
        .toLowerCase()
        .includes(q);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, filter, query, radiusChoice, customMiles, center]);

  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<CategoryId, number>> = {};
    for (const c of CATEGORIES) counts[c.id] = 0;
    for (const r of inScope) {
      if (r.category && counts[r.category as CategoryId] !== undefined) {
        counts[r.category as CategoryId] = (counts[r.category as CategoryId] ?? 0) + 1;
      }
    }
    return counts;
  }, [inScope]);

  // Closest bounties first (like Google Local results); unknown distances go last.
  // Category tiles, sub-options and typed keyword all filter in real time.
  const list = useMemo(() => {
    const subOption = cat === "all" ? undefined : subOptionById(cat, sub);
    const filtered = inScope.filter((r) => {
      if (cat === "all") return true;
      // A sub-option may point at its own stored category (Events → Sports).
      const wanted = subOption?.category ?? cat;
      if (r.category !== wanted) return false;
      if (subOption && !subOption.category) {
        const catLabel = (CATEGORIES.find((c) => c.id === r.category)?.label ?? "").toLowerCase();
        const haystack =
          `${r.title} ${r.place} ${r.note} ${r.instructions ?? ""} ${r.category ?? ""} ${catLabel}`.toLowerCase();
        if (!haystack.includes(subOption.label.toLowerCase())) return false;
      }
      return true;
    });
    if (!center) return filtered;
    const from = center;
    return [...filtered].sort(
      (a, b) =>
        distanceMiles(from, requestMapPosition(a)) - distanceMiles(from, requestMapPosition(b)),
    );
  }, [inScope, cat, sub, center]);

  const distanceLabel = (r: (typeof requests)[number]) =>
    center ? formatDistance(distanceMiles(center, requestMapPosition(r))) : undefined;
  const pot = inScope.filter((r) => r.status === "open").reduce((s, r) => s + r.bounty, 0);

  const displayCustom = Math.round(unit === "mi" ? customMiles : customMiles * 1.609344);

  const handleCustomInput = (value: string) => {
    const num = parseInt(value.replace(/\D/g, ""), 10);
    if (Number.isNaN(num) || num <= 0) return;
    const miles = unit === "mi" ? num : num / 1.609344;
    setCustomMiles(miles);
  };

  const expandRadius = () => {
    if (nextWiderRadius === "custom") {
      setRadiusChoice("custom");
      setCustomMiles((m) => Math.max(m * 2, DEFAULT_CUSTOM_MILES));
    } else {
      setRadiusChoice(nextWiderRadius);
    }
  };

  return (
    <div className="app-shell pb-28 pt-6">
      <h1 className="font-display text-3xl tracking-tight text-foreground">Live requests</h1>
      <div className="mt-1 flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          <span className="text-signal">${pot}</span> in open bounties within {radiusLabel} of you.
        </p>
        <div
          className="flex items-center gap-1 rounded-full border border-border bg-surface p-1"
          role="group"
          aria-label="Search radius"
        >
          {radiusOptions.map((o) => (
            <button
              key={o.label}
              type="button"
              onClick={() => setRadiusChoice(o.miles)}
              aria-pressed={radiusChoice === o.miles}
              className={
                "rounded-full px-2.5 py-1 text-[0.66rem] font-extrabold uppercase transition-colors " +
                (radiusChoice === o.miles
                  ? "bg-signal text-signal-foreground"
                  : "text-muted-foreground hover:text-foreground")
              }
            >
              {o.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setRadiusChoice("custom")}
            aria-pressed={radiusChoice === "custom"}
            className={
              "rounded-full px-2.5 py-1 text-[0.66rem] font-extrabold uppercase transition-colors " +
              (radiusChoice === "custom"
                ? "bg-signal text-signal-foreground"
                : "text-muted-foreground hover:text-foreground")
            }
          >
            Custom
          </button>
        </div>
        {radiusChoice === "custom" && (
          <label className="inline-flex items-center gap-1 rounded-full border border-border bg-surface px-2 py-1">
            <input
              type="number"
              min={1}
              value={displayCustom}
              onChange={(e) => handleCustomInput(e.target.value)}
              aria-label={`Custom radius in ${unit}`}
              className="w-12 bg-transparent text-center text-[0.7rem] font-bold text-foreground outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="pr-1 text-[0.65rem] font-bold uppercase text-muted-foreground">
              {unit}
            </span>
          </label>
        )}
      </div>

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
      <div className="mt-2">
        <CategoryPicker
          value={cat}
          onChange={(id: CategoryPickerValue) => setCat(id)}
          sub={sub}
          onSubChange={setSub}
          includeAll
          counts={categoryCounts}
        />
      </div>

      <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-surface px-3">
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search a venue, gate, section, or place..."
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

      {/* Jump the feed to any city, venue, landmark or address. */}
      <div className="mt-3">
        <PlaceSearchInput
          placeholder="Filter by city, venue, landmark or address"
          onQueryChange={setPlaceQuery}
          onPick={(place) => {
            setPlaceQuery("");
            setArea({ label: place.formatted, lat: place.latitude, lng: place.longitude });
          }}
        />
        {area && (
          <div className="mt-2 flex items-center justify-between gap-2 rounded-xl border border-signal/50 bg-signal/10 px-3 py-2">
            <p className="truncate text-xs font-bold text-foreground">
              Showing requests near {area.label}
            </p>
            <button
              type="button"
              onClick={() => setArea(null)}
              className="shrink-0 text-[0.65rem] font-extrabold uppercase text-signal"
            >
              Clear
            </button>
          </div>
        )}
        {!area && query.trim().length === 0 && placeQuery.trim().length === 0 && (
          <TrendingViewRequests
            className="mt-3"
            onOpen={(request) => navigate({ to: "/", search: { b: request.id } })}
          />
        )}
      </div>

      <p className="mt-4 text-[0.68rem] font-bold uppercase text-muted-foreground">Status</p>
      <div className="mt-2 grid grid-cols-2 gap-1.5 min-[420px]:grid-cols-3 sm:grid-cols-5">
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

      <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {list.map((r) => (
          <BountyDetailsDialog key={r.id} request={r} onClaim={claim}>
            <RequestCard request={r} compact distanceLabel={distanceLabel(r)} />
          </BountyDetailsDialog>
        ))}
        {list.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center">
            <p className="text-sm text-muted-foreground">
              Nothing open within {radiusLabel} of you right now.
            </p>
            <button
              type="button"
              onClick={expandRadius}
              className="mt-3 rounded-full border border-signal bg-surface px-4 py-2 text-xs font-extrabold uppercase text-signal"
            >
              {nextWiderRadius === "custom"
                ? radiusChoice === "custom"
                  ? `Expand to ${Math.round(unit === "mi" ? customMiles * 2 : customMiles * 2 * 1.609344)} ${unit}`
                  : "Use custom radius"
                : `Expand to ${radiusOptions.find((o) => o.miles === nextWiderRadius)?.label}`}
            </button>
          </div>
        )}
        {list.length === 0 && (
          <RecentCapturesFeed blurb="Nothing live nearby, watch captures that already wrapped." />
        )}
      </div>
    </div>
  );
}
