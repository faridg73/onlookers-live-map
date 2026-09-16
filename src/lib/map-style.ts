/// <reference types="google.maps" />

/**
 * Permanent shared Google Maps skin. Every map surface imports this single
 * configuration so Google cannot fall back to its light roadmap appearance.
 * Styling only: native map gestures, controls, map data, and markers are
 * intentionally unaffected.
 */
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [];

/** Lemon-green teardrop pin for native Google markers (pickers, global feed). */
export function lemonPinIcon(maps: typeof google.maps): google.maps.Symbol {
  return {
    path: "M 0 0 C -2 -2 -7 -7.5 -7 -11 A 7 7 0 1 1 7 -11 C 7 -7.5 2 -2 0 0 z",
    fillColor: "#CCFF00",
    fillOpacity: 1,
    strokeColor: "#0F0F0F",
    strokeWeight: 1.5,
    scale: 1.5,
  };
}
