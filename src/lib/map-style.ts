/// <reference types="google.maps" />

/**
 * Shared map appearance for every map in the app (Home, Discover, post,
 * Flash, community). One clean, light Google roadmap: muted land colours,
 * clear road networks and standard highway shields. Keeping the options in
 * one place stops the screens drifting apart again.
 */
export const SHARED_MAP_OPTIONS: google.maps.MapOptions = {
  clickableIcons: false,
  disableDefaultUI: true,
  gestureHandling: "greedy",
  mapTypeId: "roadmap",
};
