import { useCallback, useEffect, useState } from "react";
import { requestCurrentPosition } from "@/lib/geolocation";
import { geocodeAddress, reverseGeocode } from "@/lib/geocode.functions";

/** The area the browse screens are showing places for. */
export type DiscoveryArea = {
  label: string;
  latitude: number;
  longitude: number;
};

const KEY = "onlooker.discovery-area";
const EVENT = "onlooker:discovery-area-change";

const FALLBACK: DiscoveryArea = {
  label: "Los Angeles, CA",
  latitude: 34.0522,
  longitude: -118.2437,
};

function shortLabel(formatted: string) {
  const parts = formatted
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 2) return formatted;
  return parts.slice(-3, -1).join(", ");
}

function read(): DiscoveryArea | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DiscoveryArea;
    if (typeof parsed?.latitude !== "number" || typeof parsed?.longitude !== "number") return null;
    return parsed;
  } catch {
    return null;
  }
}

function write(area: DiscoveryArea) {
  try {
    localStorage.setItem(KEY, JSON.stringify(area));
  } catch {
    /* storage unavailable */
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Keeps the browsing area in one place across screens: a saved choice, the
 * device's GPS, or a typed city. Defaults to Los Angeles until we know better.
 */
export function useDiscoveryArea() {
  const [area, setArea] = useState<DiscoveryArea>(FALLBACK);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sync = () => setArea(read() ?? FALLBACK);
    sync();
    setReady(true);
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  // First visit with location already allowed: pick up the real area silently.
  useEffect(() => {
    if (!ready || read()) return;
    let cancelled = false;
    void (async () => {
      try {
        const state = await navigator.permissions?.query({ name: "geolocation" });
        if (cancelled || state?.state !== "granted") return;
        const position = await requestCurrentPosition();
        if (cancelled) return;
        const { latitude, longitude } = position.coords;
        const place = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
        write({
          label: place?.formatted ? shortLabel(place.formatted) : "Near you",
          latitude,
          longitude,
        });
      } catch {
        /* stay on the fallback area */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ready]);

  const useMyLocation = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const position = await requestCurrentPosition();
      const { latitude, longitude } = position.coords;
      const place = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
      write({
        label: place?.formatted ? shortLabel(place.formatted) : "Near you",
        latitude,
        longitude,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Your location could not be found.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  const setCity = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) return false;
    setBusy(true);
    setError(null);
    try {
      const place = await geocodeAddress({ data: { address: trimmed } });
      if (!place) {
        setError("We couldn't find that city. Try adding the state or country.");
        return false;
      }
      write({
        label: place.formatted ? shortLabel(place.formatted) : trimmed,
        latitude: place.latitude,
        longitude: place.longitude,
      });
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "That city could not be looked up.");
      return false;
    } finally {
      setBusy(false);
    }
  }, []);

  return { area, ready, busy, error, useMyLocation, setCity };
}
