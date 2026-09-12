import { useEffect, useState } from "react";

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

export function useDistanceUnit() {
  const [unit, setUnit] = useState<DistanceUnit>("km");

  useEffect(() => {
    setUnit(distanceUnitForLocales(navigator.languages.length ? navigator.languages : [navigator.language]));
  }, []);

  const radius = unit === "mi" ? 5 : 8;
  const radiusMiles = unit === "mi" ? radius : radius / 1.609344;
  const formatDistance = (miles: number) =>
    `${(unit === "mi" ? miles : miles * 1.609344).toFixed(1)} ${unit}`;

  return { unit, radius, radiusMiles, formatDistance };
}