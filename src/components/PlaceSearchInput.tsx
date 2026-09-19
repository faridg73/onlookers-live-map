// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { Loader2, MapPin, Search, X } from "lucide-react";
import {
  autocompletePlaces,
  geocodeAddress,
  resolvePlaceSuggestion,
  type GeocodeResult,
  type PlaceSuggestion,
} from "@/lib/geocode.functions";

/**
 * A search box that shows live suggestions — cities, landmarks, venues and
 * street addresses — as the person types, and hands back the chosen spot's
 * coordinates so the map can centre or the feed can filter.
 */
export function PlaceSearchInput({
  placeholder = "Search any city, venue, landmark or address",
  onPick,
  onQueryChange,
  className = "",
  autoFocus = false,
  value,
}: {
  placeholder?: string;
  onPick: (place: GeocodeResult) => void;
  onQueryChange?: (query: string) => void;
  className?: string;
  autoFocus?: boolean;
  value?: string;
}) {
  const [internalQuery, setInternalQuery] = useState(value ?? "");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const sessionToken = useRef<string>(crypto.randomUUID());
  const requestId = useRef(0);
  const query = value ?? internalQuery;

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    const id = ++requestId.current;
    setBusy(true);
    const timer = setTimeout(() => {
      void autocompletePlaces({
        data: { input: trimmed, sessionToken: sessionToken.current, scope: "all" },
      })
        .then((results) => {
          if (id !== requestId.current) return;
          setSuggestions(results);
          setOpen(results.length > 0);
          setHighlight(-1);
        })
        .catch(() => {
          if (id !== requestId.current) return;
          setSuggestions([]);
          setOpen(false);
        })
        .finally(() => {
          if (id === requestId.current) setBusy(false);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [query]);

  const update = (value: string) => {
    setInternalQuery(value);
    onQueryChange?.(value);
  };

  const reset = () => {
    setSuggestions([]);
    setOpen(false);
    setHighlight(-1);
    sessionToken.current = crypto.randomUUID();
  };

  const pick = (suggestion: PlaceSuggestion) => {
    setOpen(false);
    setBusy(true);
    update(suggestion.text);
    void resolvePlaceSuggestion({
      data: { placeId: suggestion.placeId, sessionToken: sessionToken.current },
    })
      .then((place) => {
        if (place) onPick({ ...place, formatted: place.formatted || suggestion.text });
      })
      .catch(() => undefined)
      .finally(() => {
        setBusy(false);
        reset();
      });
  };

  const submit = () => {
    if (highlight >= 0 && suggestions[highlight]) {
      pick(suggestions[highlight]);
      return;
    }
    if (suggestions[0]) {
      pick(suggestions[0]);
      return;
    }
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    setBusy(true);
    void geocodeAddress({ data: { address: trimmed } })
      .then((place) => {
        if (place) onPick(place);
      })
      .catch(() => undefined)
      .finally(() => setBusy(false));
  };

  return (
    <div className={`relative ${className}`}>
      <div className="flex items-center gap-2 rounded-xl border-2 border-border bg-surface px-3">
        <Search className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        <input
          value={query}
          autoFocus={autoFocus}
          onChange={(event) => update(event.target.value)}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setHighlight((h) => Math.max(h - 1, -1));
            } else if (event.key === "Enter") {
              event.preventDefault();
              submit();
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder={placeholder}
          aria-label="Search places"
          role="combobox"
          aria-expanded={open}
          aria-controls="place-search-suggestions"
          aria-activedescendant={highlight >= 0 ? `place-search-suggestion-${highlight}` : undefined}
          autoComplete="off"
          className="h-10 w-full bg-transparent text-sm font-bold text-foreground outline-none placeholder:font-normal placeholder:text-muted-foreground"
        />
        {busy ? (
          <Loader2 className="size-4 shrink-0 animate-spin text-signal" aria-hidden />
        ) : (
          query && (
            <button
              type="button"
              onClick={() => {
                update("");
                reset();
              }}
              aria-label="Clear search"
              className="shrink-0 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          )
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          id="place-search-suggestions"
          role="listbox"
          aria-label="Place suggestions"
          className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl"
        >
          {suggestions.map((suggestion, index) => (
            <li
              key={suggestion.placeId}
              role="option"
              aria-selected={index === highlight}
              id={`place-search-suggestion-${index}`}
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
  );
}
