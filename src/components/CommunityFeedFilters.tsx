// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { Check, ChevronDown, Loader2, LocateFixed, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { DistanceUnit } from "@/hooks/use-distance-unit";
import { autocompletePlaces, resolvePlaceSuggestion, type PlaceSuggestion } from "@/lib/geocode.functions";

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

type ResolvedPlace = { latitude: number; longitude: number; formatted: string };

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
  onApplyPlace,
}: {
  unit: DistanceUnit;
  value: RadiusChoiceId;
  onChange: (id: RadiusChoiceId) => void;
  areaLabel: string;
  locationBusy: boolean;
  locationError: string | null;
  onUseMyLocation: () => Promise<boolean>;
  onSearchArea: (query: string) => Promise<boolean>;
  onApplyPlace: (place: ResolvedPlace) => boolean;
}) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const sessionToken = useRef<string>(crypto.randomUUID());
  const requestId = useRef(0);

  // Debounced live suggestions while the person types.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      return;
    }
    setSuggesting(true);
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void autocompletePlaces({ data: { input: trimmed, sessionToken: sessionToken.current } })
        .then((results) => {
          if (id !== requestId.current) return;
          setSuggestions(results);
          setOpen(results.length > 0);
          setHighlight(-1);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setSuggestions([]);
        })
        .finally(() => {
          if (id === requestId.current) setSuggesting(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const resetSearch = () => {
    setQuery("");
    setSuggestions([]);
    setOpen(false);
    sessionToken.current = crypto.randomUUID();
  };

  const pickSuggestion = (suggestion: PlaceSuggestion) => {
    setOpen(false);
    void resolvePlaceSuggestion({ data: { placeId: suggestion.placeId, sessionToken: sessionToken.current } })
      .then((place) => {
        if (place) {
          onApplyPlace(place);
        } else {
          return onSearchArea(suggestion.text);
        }
        return undefined;
      })
      .then(() => resetSearch())
      .catch(() => {
        void onSearchArea(suggestion.text).then(() => resetSearch());
      });
  };

  const submitTyped = () => {
    void onSearchArea(query).then((ok) => {
      if (!ok) return;
      resetSearch();
    });
  };

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className="h-10 max-w-full rounded-full border-white/15 bg-zinc-900/70 px-3.5 text-sm font-bold text-foreground hover:border-signal/60 hover:bg-zinc-900"
          aria-label={`Change location and radius. Current selection: ${areaLabel}, ${radiusLabel(value, unit)}`}
        >
          <MapPin className="size-4 shrink-0 text-signal" />
          <span className="truncate">{areaLabel}</span>
          <span className="shrink-0 text-muted-foreground">· {radiusLabel(value, unit).replace(" ", "")}</span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </Button>
      </SheetTrigger>

      <SheetContent side="bottom" className="max-h-[85dvh] overflow-y-auto rounded-t-xl border-border bg-surface">
        <div className="mx-auto w-full max-w-xl">
          <SheetHeader className="pr-12 text-left">
            <SheetTitle>Location &amp; radius</SheetTitle>
            <SheetDescription>Choose where to look and how far from that area.</SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-5">
            <Button
              type="button"
              variant="outline"
              disabled={locationBusy}
              onClick={() => void onUseMyLocation()}
              className="w-full justify-center rounded-full border-white/15 bg-zinc-900/50 font-bold text-signal hover:border-signal/60"
            >
              {locationBusy ? <Loader2 className="size-4 animate-spin" /> : <LocateFixed className="size-4" />}
              {locationBusy ? "Locating…" : "Use my location"}
            </Button>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (highlight >= 0 && suggestions[highlight]) {
              pickSuggestion(suggestions[highlight]);
              return;
            }
            submitTyped();
          }}
        >
          <div className="relative min-w-0 flex-1">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onFocus={() => suggestions.length > 0 && setOpen(true)}
              onBlur={() => setTimeout(() => setOpen(false), 150)}
              onKeyDown={(event) => {
                if (event.key === "ArrowDown") {
                  event.preventDefault();
                  setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
                } else if (event.key === "ArrowUp") {
                  event.preventDefault();
                  setHighlight((h) => Math.max(h - 1, -1));
                } else if (event.key === "Escape") {
                  setOpen(false);
                }
              }}
              placeholder="City or state, e.g. Austin, TX"
              aria-label="City or state"
              role="combobox"
              aria-expanded={open}
              aria-controls="area-suggestions"
              aria-activedescendant={highlight >= 0 ? `area-suggestion-${highlight}` : undefined}
              autoComplete="off"
              className="w-full rounded-lg border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-signal"
            />
            {open && suggestions.length > 0 && (
              <ul
                id="area-suggestions"
                role="listbox"
                aria-label="Place suggestions"
                className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-surface shadow-lg"
              >
                {suggestions.map((suggestion, index) => (
                  <li key={suggestion.placeId} role="option" aria-selected={index === highlight} id={`area-suggestion-${index}`}>
                    <button
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => pickSuggestion(suggestion)}
                      onMouseEnter={() => setHighlight(index)}
                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-foreground ${
                        index === highlight ? "bg-surface-raised" : ""
                      }`}
                    >
                      <MapPin className="size-3.5 shrink-0 text-signal" aria-hidden />
                      <span className="truncate">{suggestion.text}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button
            type="submit"
            size="sm"
            disabled={locationBusy || query.trim().length < 3}
            aria-label="Apply city or state"
            className="h-9 px-3"
          >
            {locationBusy || suggesting ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          </Button>
        </form>
            {locationError && <p className="col-span-full text-xs text-destructive">{locationError}</p>}
          </form>

          <div>
            <p className="mb-2 text-xs font-extrabold uppercase text-muted-foreground">Radius</p>
            <div className="grid grid-cols-4 gap-2" aria-label="Distance from selected area">
              {RADIUS_CHOICES.map((choice) => (
                <Button
                  key={choice.id}
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onChange(choice.id)}
                  aria-pressed={value === choice.id}
                  className={`h-9 min-w-0 rounded-full border px-2 text-xs font-extrabold ${
                    value === choice.id
                      ? "border-signal bg-signal text-signal-foreground"
                      : "border-white/10 bg-zinc-900/50 text-muted-foreground hover:border-white/25"
                  }`}
                >
                  {radiusLabel(choice.id, unit).replace(" ", "")}
                </Button>
              ))}
            </div>
          </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
