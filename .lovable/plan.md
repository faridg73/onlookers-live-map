# Default satellite maps across Onlooker LLC

## Changes
- Change the shared Google map default from roadmap to hybrid aerial imagery, combining satellite photography with roads, place names, and other useful labels.
- Apply the shared setting to Home, Discover, global feed, report, and location preview/picker maps without changing markers, search, geolocation, clustering, zoom, or selection behavior.
- Keep existing app controls interactive and expose Google’s map-type control so users can switch between map views when needed.

## Verification
- Confirm every Google map constructor uses the shared hybrid configuration with no conflicting local map-type override.
- Test Home, Discover, and a location map at phone and desktop sizes for visible aerial imagery, labels, controls, markers, zooming, panning, and selection.
- Check for browser errors and run the project’s automatic checks.

## Technical details
- Update the centralized shared map options rather than duplicating settings across individual screens.
- Use Google Maps `hybrid` mode for satellite imagery with labels and enable only the map-type control while preserving the app’s existing custom controls.
