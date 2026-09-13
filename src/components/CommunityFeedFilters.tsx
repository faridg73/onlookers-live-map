import { Loader2, LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { DistanceUnit } from "@/hooks/use-distance-unit";

/** Radius options offered on Discover, in the viewer's own units. */
export const RADIUS_CHOICES = [
  { id: "tight", mi: 1, km: 2 },
  { id: "near", mi: 5, km: 8 },
  { id: "city", mi: 25, km: 40 },
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
  locating,
  hasLocation,
  locationError,
  onRetryLocation,
}: {
  unit: DistanceUnit;
  value: RadiusChoiceId;
  onChange: (id: RadiusChoiceId) => void;
  locating: boolean;
  hasLocation: boolean;
  locationError: string | null;
  onRetryLocation: () => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
        <MapPin className="size-3.5 text-signal" /> Around me
      </span>
      {RADIUS_CHOICES.map((choice) => (
        <Button
          key={choice.id}
          type="button"
          variant="outline"
          size="sm"
          disabled={choice.mi !== null && !hasLocation}
          onClick={() => onChange(choice.id)}
          aria-pressed={value === choice.id}
          className={`h-7 rounded-full px-3 text-[0.68rem] font-bold ${
            value === choice.id ? "border-signal bg-signal/10 text-signal" : "text-muted-foreground"
          }`}
        >
          {radiusLabel(choice.id, unit)}
        </Button>
      ))}
      {locating && (
        <span className="inline-flex items-center gap-1.5 text-[0.68rem] text-muted-foreground">
          <Loader2 className="size-3.5 animate-spin" /> Finding you…
        </span>
      )}
      {!locating && !hasLocation && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={onRetryLocation}
          className="h-7 rounded-full px-2 text-[0.68rem] font-bold text-signal"
        >
          <LocateFixed className="size-3.5" /> Use my location
        </Button>
      )}
      {locationError && !hasLocation && (
        <span className="w-full text-[0.68rem] text-muted-foreground">
          {locationError} Showing posts from everywhere for now.
        </span>
      )}
    </div>
  );
}
