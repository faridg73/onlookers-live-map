import strangeSightingsAsset from "@/assets/strange-sightings-ufo.jpg.asset.json";

export const STRANGE_SIGHTINGS_ID = "strange-sightings-ufo" as const;
export const STRANGE_SIGHTINGS_LABEL = "Strange Sightings & UFO";
export const STRANGE_SIGHTINGS_IMAGE_URL = strangeSightingsAsset.url;

export const STRANGE_SIGHTINGS_SUBCATEGORIES = [
  "UFO",
  "Unexplained Lights",
  "Unusual Aircraft",
  "Strange Sounds",
  "Unexplained Events",
] as const;

export const STRANGE_SIGHTINGS_TERMS = [
  "ufo",
  "uap",
  "strange sighting",
  "unexplained light",
  "mystery light",
  "unusual aircraft",
  "strange sound",
  "unexplained event",
  "flying object",
  "mystery",
  "sighting",
] as const;

export function matchesStrangeSighting(text: string) {
  const haystack = text.toLowerCase();
  return STRANGE_SIGHTINGS_TERMS.some((term) => haystack.includes(term));
}