// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search, X } from "lucide-react";
import { toast } from "sonner";

import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import {
  autocompletePlaces,
  resolvePlaceSuggestion,
  type PlaceSuggestion,
} from "@/lib/geocode.functions";

/**
 * Always-visible search box for the browse screens. Typing any city, landmark or
 * address brings back live suggestions; picking one switches the area everything
 * on the screen is pulled from, so trending spots and events refresh right away.
 */
export function LocationSearchBar({ className = "" }: { className?: string }) {
  const { area, busy, error, useMyLocation, setCity, applyPlace } = useDiscoveryArea();
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [suggesting, setSuggesting] = useState(false);
  const [listOpen, setListOpen] = useState(false);
  const [highlight, setHighlight] = useState(-1);
  const [applying, setApplying] = useState(false);
  const sessionToken = useRef<string>(crypto.randomUUID());
  const requestId = useRef(0);

  // Debounced live suggestions — cities, landmarks, venues and addresses.
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
      void autocompletePlaces({
        data: { input: trimmed, sessionToken: sessionToken.current, scope: "all" },
      })
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

  function reset() {
    setQuery("");
    setSuggestions([]);
    setListOpen(false);
    setHighlight(-1);
    sessionToken.current = crypto.randomUUID();
  }

  async function pick(suggestion: PlaceSuggestion) {
    setListOpen(false);
    setApplying(true);
    try {
      const place = await resolvePlaceSuggestion({
        data: { placeId: suggestion.placeId, sessionToken: sessionToken.current },
      }).catch(() => null);
      if (place) {
        applyPlace(place);
      } else {
        const ok = await setCity(suggestion.text);
        if (!ok) return;
      }
      toast.success(`Now browsing ${suggestion.text}`);
      reset();
    } finally {
      setApplying(false);
    }
  }

  async function submit() {
    if (highlight >= 0 && suggestions[highlight]) return pick(suggestions[highlight]);
    if (suggestions[0]) return pick(suggestions[0]);
    const trimmed = query.trim();
    if (trimmed.length < 3) return;
    setApplying(true);
    try {
      const ok = await setCity(trimmed);
      if (ok) {
        toast.success(`Now browsing ${trimmed}`);
        reset();
      }
    } finally {
      setApplying(false);
    }
  }

  const working = busy || applying;

  return (
    <div className={className}>
      <form
        className="flex items-center gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
      >
        <div className="relative min-w-0 flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
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
            placeholder="Search any city, landmark or address"
            aria-label="Search a location to browse"
            role="combobox"
            aria-expanded={listOpen}
            aria-controls="location-search-suggestions"
            aria-activedescendant={
              highlight >= 0 ? `location-search-suggestion-${highlight}` : undefined
            }
            autoComplete="off"
            className="h-12 w-full rounded-2xl border border-border bg-surface pl-9 pr-9 text-sm text-foreground placeholder:text-muted-foreground focus:border-signal focus:outline-none"
          />
          {(suggesting || applying) && (
            <Loader2
              className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-signal"
              aria-hidden
            />
          )}
          {!suggesting && !applying && query.length > 0 && (
            <button
              type="button"
              aria-label="Clear search"
              onClick={reset}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" aria-hidden />
            </button>
          )}

          {listOpen && suggestions.length > 0 && (
            <ul
              id="location-search-suggestions"
              role="listbox"
              aria-label="Location suggestions"
              className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-xl"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.placeId}
                  role="option"
                  aria-selected={index === highlight}
                  id={`location-search-suggestion-${index}`}
                >
                  <button
                    type="button"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => void pick(suggestion)}
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
          type="button"
          disabled={working}
          aria-label="Browse my current location"
          onClick={() =>
            void useMyLocation().then((ok) => {
              if (ok) {
                reset();
                toast.success("Now browsing your current area");
              }
            })
          }
          className="grid size-12 shrink-0 place-items-center rounded-2xl border border-border bg-surface text-foreground disabled:opacity-50"
        >
          {working ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <Crosshair className="size-4" aria-hidden />
          )}
        </button>
      </form>

      <p className="mt-1.5 truncate text-[0.68rem] text-muted-foreground">
        Browsing <span className="font-bold text-foreground">{area.label}</span>
      </p>
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}
