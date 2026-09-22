// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/// <reference types="google.maps" />

/** Shared, unstyled Google road map settings for every functional map view. */
export const SHARED_MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  disableDefaultUI: true,
  gestureHandling: "greedy",
  mapTypeId: "roadmap",
  mapTypeControl: true,
  mapTypeControlOptions: {
    mapTypeIds: ["roadmap", "satellite"],
  },
};

