# Default Google map and official logo rollout

## What will change

### 1. Restore the familiar Google Maps appearance
- Remove the shared dark map styling from the Home map, the global feed map, and location preview/picker maps.
- Let Google render its standard roadmap colors, roads, labels, landmarks, transit details, and business labels.
- Keep every existing Onlooker marker, place result, rating/detail card, location search, pan, zoom, geolocation, bounty selection, and popup behavior unchanged.
- Keep the app’s own map controls and layout exactly where they are; this is a basemap-style change only.

### 2. Replace the Onlooker logo everywhere
- Use the uploaded official square logo as the single source image.
- Crop away the large white margin around the supplied image so the black square and lime eye fill each logo area cleanly, without stretching.
- Generate crisp sizes for the Home header badge, video watermark, browser favicon, installable web-app icons, and Apple touch icon.
- Update the iOS app icon and every Android launcher icon density, including Android’s adaptive foreground, so installed apps use the same official mark.
- Keep the existing header card size, text, slogan, placement, UI card layouts, and all app behavior unchanged.

## Verification
- Confirm no map constructor still applies a custom style array.
- Check the Home map and a location picker at phone and desktop sizes for standard Google colors and intact interactions.
- Check the new logo in the header, browser tab/install metadata, share-video watermark source, and native icon files.
- Run the project checks and verify no new browser errors.

## Technical details
- The map change removes only `styles` overrides; it does not alter map events, markers, data loading, controls, or dialogs.
- The uploaded JPEG will be processed into correctly sized square PNG assets, preventing its current white outer canvas from making the logo appear too small.
- No database, authentication, business logic, copy, headers, or popup code will be changed.
