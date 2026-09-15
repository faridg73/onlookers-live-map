/// <reference types="google.maps" />

/**
 * Shared Google Maps skin: a dark grey basemap so every Onlooker marker in
 * lemon green (#CCFF00 — the same neon lime as the app's --signal token) pops
 * with maximum contrast.
 */
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#2b2b2b" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#9a9a9a" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#2b2b2b" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#2b2b2b" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#6f6f6f" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3d3d3d" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#2b2b2b" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#3d3d3d" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#3d3d3d" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#7a7a7a" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#26332a" }] },
];

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
