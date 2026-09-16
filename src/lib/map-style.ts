/// <reference types="google.maps" />

/**
 * Permanent shared Google Maps skin. Every map surface imports this single
 * configuration so Google cannot fall back to its light roadmap appearance.
 * Styling only: native map gestures, controls, map data, and markers are
 * intentionally unaffected.
 */
export const DARK_MAP_STYLES: google.maps.MapTypeStyle[] = [
  { elementType: "geometry", stylers: [{ color: "#252525" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#a3a3a3" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#1a1a1a" }] },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#252525" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#292929" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#858585" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#263329" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#3b3b3b" }] },
  { featureType: "road", elementType: "geometry.stroke", stylers: [{ color: "#202020" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#b3b3b3" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#4a4a4a" }] },
  { featureType: "road.highway", elementType: "geometry.stroke", stylers: [{ color: "#303030" }] },
  { featureType: "transit", elementType: "geometry", stylers: [{ color: "#303030" }] },
  { featureType: "transit.station", elementType: "labels.text.fill", stylers: [{ color: "#8f8f8f" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#151515" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#6f6f6f" }] },
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
