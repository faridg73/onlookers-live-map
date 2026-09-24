// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState } from "react";
import { MapPin, Navigation, Search } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import type { PickedLocation } from "@/components/LocationPreviewMap";
import {
  autocompletePlaces,
  geocodeAddress,
  resolvePlaceSuggestion,
  reverseGeocode,
  type PlaceSuggestion,
} from "@/lib/geocode.functions";

type Props = {
  initialText?: string;
  onPick: (location: PickedLocation) => void;
  placeholder?: string;
};

const COORDS = /^\s*(-?\d{1,2}(?:\.\d+)?)\s*,\s*(-?\d{1,3}(?:\.\d+)?)\s*$/;

/** Address, landmark and coordinate search that drops the pin on the map. */
export function AddressSearchField({ onPick, placeholder, initialText }: Props) {
  const [text, setText] = useState("");
  useEffect(() => {
    if (initialText) setText((t) => t || initialText);
  }, [initialText]);
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [busy, setBusy] = useState(false);
  const session = useRef<string>(crypto.randomUUID());
  const skipNext = useRef(false);

  useEffect(() => {
    if (skipNext.current) {
      skipNext.current = false;
      return;
    }
    const query = text.trim();
    if (query.length < 3 || COORDS.test(query)) {
      setSuggestions([]);
      return;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      void autocompletePlaces({
        data: { input: query, sessionToken: session.current, scope: "all" },
      })
        .then((rows) => {
          if (active) setSuggestions(rows);
        })
        .catch(() => {
          if (active) setSuggestions([]);
        });
    }, 300);
    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [text]);

  const apply = (found: PickedLocation) => {
    skipNext.current = true;
    setText(found.formatted);
    setSuggestions([]);
    onPick(found);
  };

  const choose = async (suggestion: PlaceSuggestion) => {
    setBusy(true);
    try {
      const found = await resolvePlaceSuggestion({
        data: { placeId: suggestion.placeId, sessionToken: session.current },
      });
      session.current = crypto.randomUUID();
      if (!found) {
        toast.error("Could not locate that address.");
        return;
      }
      apply({
        latitude: found.latitude,
        longitude: found.longitude,
        formatted: found.formatted || suggestion.text,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Address lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  const runSearch = async () => {
    const query = text.trim();
    if (query.length < 3) {
      toast.error("Type a street address, landmark, or coordinates.");
      return;
    }
    setBusy(true);
    try {
      const coords = COORDS.exec(query);
      if (coords) {
        const latitude = Number(coords[1]);
        const longitude = Number(coords[2]);
        if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
          toast.error("Those coordinates are out of range.");
          return;
        }
        const named = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
        apply({
          latitude,
          longitude,
          formatted: named?.formatted || `${latitude}, ${longitude}`,
        });
        return;
      }
      const found = await geocodeAddress({ data: { address: query } });
      if (!found) {
        toast.error("No match for that address. Try adding the city.");
        return;
      }
      apply({
        latitude: found.latitude,
        longitude: found.longitude,
        formatted: found.formatted || query,
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Address lookup failed.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3.5 size-4 text-signal" />
          <input
            value={text}
            onChange={(event) => setText(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                void runSearch();
              }
            }}
            placeholder={placeholder ?? "Search a street address, landmark, or 33.6189, -117.9289"}
            aria-label="Search an address, landmark, or coordinates"
            className="field pl-10"
          />
          {busy && (
            <span className="absolute right-3 top-3.5 size-4 animate-spin rounded-full border-2 border-signal border-t-transparent" />
          )}
        </div>
        <Button type="button" onClick={() => void runSearch()} disabled={busy} className="shrink-0 gap-1.5">
          <Navigation className="size-4" />
          Find
        </Button>
      </div>
      {suggestions.length > 0 && (
        <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-background">
          {suggestions.map((suggestion) => (
            <Button
              key={suggestion.placeId}
              type="button"
              variant="ghost"
              onClick={() => void choose(suggestion)}
              className="h-auto w-full justify-start rounded-none px-3 py-3 text-left"
            >
              <MapPin className="mr-3 size-4 shrink-0 text-signal" />
              <span className="min-w-0 truncate text-sm font-bold text-foreground">{suggestion.text}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
}
