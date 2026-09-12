# Runtime, Feed, and Location Fix

## Changes
- Confirm `/feed` is the single mounted Feed route and remove or bypass any legacy/fallback path if found.
- Preserve the current Feed layout with category choices above search, live keyword/category filtering, GPS distance labels, proximity sorting, and details-first claim confirmation.
- Harden map geolocation with availability and permission checks, explicit diagnostic logging, precise-first/coarse-fallback acquisition, and reliable marker/center updates before or after map readiness.
- Add deployment-safe cache headers/version handling so HTML and app metadata refresh while fingerprinted assets remain cache-efficient; remove any stale service-worker registration if present.
- Validate Feed and map behavior in a phone-sized browser, then restart the preview process to clear its runtime bundle cache.

## Technical details
- Use the browser Permissions API when available, while still calling geolocation to trigger the native permission prompt when state is `prompt` or unknown.
- Keep denied/unavailable feedback visible and log structured geolocation error codes without exposing user coordinates.
- Verify route generation and rendered DOM rather than editing generated route files.
