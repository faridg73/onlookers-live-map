// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />

/**
 * Shared map appearance for every map in the app (Home, Discover, post,
 * Flash, community). Hybrid mode combines aerial imagery with Google's road,
 * place and landmark labels. Keeping the options in one place stops the
 * screens drifting apart again.
 */
export const SHARED_MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  disableDefaultUI: true,
  gestureHandling: "greedy",
  mapTypeId: "hybrid",
  mapTypeControl: true,
  mapTypeControlOptions: {
    mapTypeIds: ["hybrid", "satellite", "roadmap"],
  },
};

/**
 * Dark, label-free base map for the Home screen: near-black terrain, a lighter
 * road network and water — with every Google label, POI and business name
 * hidden so only Onlooker's own live pins, alerts and bounties read on top.
 */
export const HIDE_LABELS_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "geometry", stylers: [{ color: "#101210" }] },
  {
    featureType: "landscape.natural.terrain",
    elementType: "geometry",
    stylers: [{ color: "#161915" }],
  },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#0b1420" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#2b2d31" }] },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#3f424a" }],
  },
  {
    featureType: "road.arterial",
    elementType: "geometry",
    stylers: [{ color: "#34363b" }],
  },
  { featureType: "administrative", elementType: "geometry.stroke", stylers: [{ color: "#2e3136" }] },
];
