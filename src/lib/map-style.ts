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
 * Home default: aerial imagery with every Google label layer hidden (roads,
 * places, businesses, transit) so only Onlooker pins are visible. Toggled
 * back on from the Home map's Labels checkbox.
 */
export const HIDE_LABELS_MAP_STYLE: google.maps.MapTypeStyle[] = [
  { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "poi.business", stylers: [{ visibility: "off" }] },
  { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { featureType: "landscape", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "water", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.neighborhood", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.land_parcel", elementType: "labels", stylers: [{ visibility: "off" }] },
];

