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
