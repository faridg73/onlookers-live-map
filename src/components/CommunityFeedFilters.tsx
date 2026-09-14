import { useState } from "react";
import { Check, Loader2, LocateFixed, MapPin, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DistanceUnit } from "@/hooks/use-distance-unit";

/** Radius options offered on Discover, in the viewer's own units. */
export const RADIUS_CHOICES = [
  { id: "tight", mi: 1, km: 2 },
  { id: "near", mi: 5, km: 8 },
  { id: "city", mi: 25, km: 40 },
  { id: "regional", mi: 50, km: 80 },
  { id: "wide", mi: 100, km: 160 },
  { id: "state", mi: 250, km: 400 },
  { id: "extended", mi: 500, km: 800 },
  { id: "any", mi: null, km: null },
] as const;

export type RadiusChoiceId = (typeof RADIUS_CHOICES)[number]["id"];

export function radiusMilesFor(id: RadiusChoiceId): number | null {
  const choice = RADIUS_CHOICES.find((c) => c.id === id);
  return choice?.mi ?? null;
}

export function radiusLabel(id: RadiusChoiceId, unit: DistanceUnit) {
  const choice = RADIUS_CHOICES.find((c) => c.id === id);
  if (!choice || choice.mi === null) return "Anywhere";
  return unit === "mi" ? `${choice.mi} mi` : `${choice.km} km`;
}

/** Neighbourhood radius picker sitting above the Discover stream. */
export function CommunityFeedFilters({
  unit,
  value,
  onChange,
  areaLabel,
  locationBusy,
  locationError,
  onUseMyLocation,
  onSearchArea,
}: {
  unit: DistanceUnit;
  value: RadiusChoiceId;
  onChange: (id: RadiusChoiceId) => void;
  areaLabel: string;
  locationBusy: boolean;
  locationError: string | null;
  onUseMyLocation: () => Promise<boolean>;
  onSearchArea: (query: string) => Promise<boolean>;
}) {
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex max-w-full items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
          <MapPin className="size-3.5 shrink-0 text-signal" />
          <span className="truncate">Near {areaLabel}</span>
        </span>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setSearching((current) => !current)}
          aria-expanded={searching}
          className="h-7 rounded-full px-2 text-[0.68rem] font-bold text-signal"
        >
          <Search className="size-3.5" /> City or state
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={locationBusy}
          onClick={() => void onUseMyLocation()}
          className="h-7 rounded-full px-2 text-[0.68rem] font-bold text-signal"
        >
          {locationBusy ? <Loader2 className="size-3.5 animate-spin" /> : <LocateFixed className="size-3.5" />}
          My location
        </Button>
      </div>

      {searching && (
        <form
          className="flex max-w-md gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            void onSearchArea(query).then((ok) => {
              if (!ok) return;
              setQuery("");
              setSearching(false);
            });
          }}
        >
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="City or state, e.g. Austin, TX"
            aria-label="City or state"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
          />
          <Button
            type="submit"
            size="sm"
            disabled={locationBusy || query.trim().length < 3}
            aria-label="Apply city or state"
            className="h-9 px-3"
          >
            {locationBusy ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
        </form>
      )}

      {locationError && <p className="text-[0.68rem] text-destructive">{locationError}</p>}

      <div className="flex flex-wrap items-center gap-2" aria-label="Distance from selected area">
        {RADIUS_CHOICES.map((choice) => (
          <Button
            key={choice.id}
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onChange(choice.id)}
            aria-pressed={value === choice.id}
            className={`h-7 rounded-full px-3 text-[0.68rem] font-bold ${
              value === choice.id ? "border-signal bg-signal/10 text-signal" : "text-muted-foreground"
            }`}
          >
            {radiusLabel(choice.id, unit)}
          </Button>
        ))}
      </div>
    </div>
  );
}
