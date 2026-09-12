import { useEffect, useState } from "react";
import { loadGoogleMaps } from "@/lib/google-maps-loader";
import type { MapPosition } from "@/lib/onlooker";

export type DistanceUnit = "mi" | "km";

/** Countries whose everyday road distances are normally shown in miles. */
const MILE_COUNTRIES = new Set(["US", "GB", "LR", "MM"]);

function regionFromLocale(locale: string) {
  try {
    return new Intl.Locale(locale).maximize().region;
  } catch {
    return undefined;
  }
}

export function distanceUnitForLocales(locales: readonly string[]): DistanceUnit {
  for (const locale of locales) {
    const region = regionFromLocale(locale);
    if (region) return MILE_COUNTRIES.has(region) ? "mi" : "km";
  }
  return "km";
}

function unitForCountry(countryCode: string): DistanceUnit {
  return MILE_COUNTRIES.has(countryCode.toUpperCase()) ? "mi" : "km";
}

async function countryAt(position: MapPosition) {
  const maps = await loadGoogleMaps();
  const response = await new maps.Geocoder().geocode({ location: position });
  return response.results
    .flatMap((result) => result.address_components)
    .find((part) => part.types.includes("country"))?.short_name;
}

export function useDistanceUnit(position?: MapPosition | null) {
  const [unit, setUnit] = useState<DistanceUnit>("km");

  useEffect(() => {
    setUnit(distanceUnitForLocales(navigator.languages.length ? navigator.languages : [navigator.language]));
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyCountry = async (at: MapPosition) => {
      const country = await countryAt(at).catch(() => undefined);
      if (!cancelled && country) setUnit(unitForCountry(country));
    };

    if (position) {
      void applyCountry(position);
    } else if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        ({ coords }) => void applyCountry({ lat: coords.latitude, lng: coords.longitude }),
        () => {},
        { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
      );
    }

    return () => {
      cancelled = true;
    };
  }, [position]);

  const radius = unit === "mi" ? 5 : 8;
  const radiusMiles = unit === "mi" ? radius : radius / 1.609344;
  const formatDistance = (miles: number) =>
    `${(unit === "mi" ? miles : miles * 1.609344).toFixed(1)} ${unit}`;

  return { unit, radius, radiusMiles, formatDistance };
}