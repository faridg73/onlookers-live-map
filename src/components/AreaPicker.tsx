// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { autocompletePlaces, resolvePlaceSuggestion, type PlaceSuggestion } from "@/lib/geocode.functions";

/**
 * Shows which city the browse screens are pulling places from, and lets the
 * person switch to their own GPS position or any other city — with live
 * suggestions as they type.
 */
export function AreaPicker({ compact = false }: { compact?: boolean }) {
  const { area, busy, error, useMyLocation, setCity, applyPlace } = useDiscoveryArea();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const sessionToken = useRef<string>(crypto.randomUUID());
  const requestId = useRef(0);

  // Debounced live city/state suggestions while the person types.
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setSuggesting(false);
      setListOpen(false);
      return;
    }
    setSuggesting(true);
    const id = ++requestId.current;
    const timer = setTimeout(() => {
      void autocompletePlaces({ data: { input: trimmed, sessionToken: sessionToken.current } })
        .then((results) => {
          if (id !== requestId.current) return;
          setSuggestions(results);
          setListOpen(results.length > 0);
          setHighlight(-1);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setSuggestions([]);
          setListOpen(false);
        })
        .finally(() => {
          if (id === requestId.current) setSuggesting(false);
        });
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const reset = () => {
    setQuery("");
    setSuggestions([]);
    setListOpen(false);
    setOpen(false);
    sessionToken.current = crypto.randomUUID();
  };

  const pick = (suggestion: PlaceSuggestion) => {
    setListOpen(false);
    void resolvePlaceSuggestion({ data: { placeId: suggestion.placeId, sessionToken: sessionToken.current } })
      .then((place) => {
        if (place) {
          applyPlace(place);
          return undefined;
        }
        return setCity(suggestion.text);
      })
      .then(() => reset())
      .catch(() => {
        void setCity(suggestion.text).then((ok) => ok && reset());
      });
  };

  const changeButton = cn(
    "shrink-0 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-foreground transition-colors hover:text-signal",
    compact
      ? "ml-1 border-l border-border py-0.5 pl-2.5 text-signal"
      : "rounded-full border border-border px-3 py-1.5",
  );

  return (
    <div className={cn(!compact && "rounded-2xl border border-border bg-surface p-3")}>
      <div
        className={cn(
          "flex items-center gap-2",
          compact && "rounded-full border border-border bg-surface px-3.5 py-2",
        )}
      >
        <MapPin className="size-4 shrink-0 text-signal" aria-hidden />
        {compact ? (
          <p className="min-w-0 flex-1 truncate text-sm font-bold text-foreground">
            <span className="mr-1.5 text-[0.6rem] font-extrabold uppercase tracking-[0.14em] text-muted-foreground">
              Near
            </span>
            {area.label}
          </p>
        ) : (
          <div className="min-w-0 flex-1">
            <p className="text-[0.62rem] font-extrabold uppercase tracking-[0.14em] text-signal">
              Showing spots near
            </p>
            <p className="truncate text-sm font-bold text-foreground">{area.label}</p>
          </div>
        )}
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className={changeButton}
        >
          Change
        </button>
      </div>

      {open && (
        <div
          className={cn(
            "space-y-2",
            compact &&
              "absolute inset-x-0 top-full z-40 mt-2 rounded-2xl border border-border bg-surface p-3 shadow-xl",
          )}
        >
          <button
            type="button"
            disabled={busy}
            onClick={() => void useMyLocation().then((ok) => ok && reset())}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal py-2.5 text-[0.68rem] font-extrabold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Crosshair className="size-4" aria-hidden />
            )}{" "}
            Use my location
          </button>
          <form
            className="flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              if (highlight >= 0 && suggestions[highlight]) {
                pick(suggestions[highlight]);
                return;
              }
              if (suggestions[0]) {
                pick(suggestions[0]);
                return;
              }
              void setCity(query).then((ok) => ok && reset());
            }}
          >
            <div className="relative min-w-0 flex-1">
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => suggestions.length > 0 && setListOpen(true)}
                onBlur={() => setTimeout(() => setListOpen(false), 150)}
                onKeyDown={(event) => {
                  if (event.key === "ArrowDown") {
                    event.preventDefault();
                    setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
                  } else if (event.key === "ArrowUp") {
                    event.preventDefault();
                    setHighlight((h) => Math.max(h - 1, -1));
                  } else if (event.key === "Escape") {
                    setListOpen(false);
                  }
                }}
                placeholder="City, e.g. Chicago, IL"
                aria-label="City or state"
                role="combobox"
                aria-expanded={listOpen}
                aria-controls="area-picker-suggestions"
                aria-activedescendant={highlight >= 0 ? `area-picker-suggestion-${highlight}` : undefined}
                autoComplete="off"
                className="location-search-highlight w-full rounded-xl bg-surface-raised px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground"
              />
              {listOpen && suggestions.length > 0 && (
                <ul
                  id="area-picker-suggestions"
                  role="listbox"
                  aria-label="Place suggestions"
                  className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-lg"
                >
                  {suggestions.map((suggestion, index) => (
                    <li
                      key={suggestion.placeId}
                      role="option"
                      aria-selected={index === highlight}
                      id={`area-picker-suggestion-${index}`}
                    >
                      <button
                        type="button"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => pick(suggestion)}
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
            <button
              type="submit"
              disabled={busy || query.trim().length < 2}
              aria-label="Search city"
              className="rounded-xl border border-border px-3 text-foreground disabled:opacity-50"
            >
              {busy || suggesting ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Search className="size-4" aria-hidden />
              )}
            </button>
          </form>
          {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
      )}
    </div>
  );
}
