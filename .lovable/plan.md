# Smart Map Marker Density

## Scope
Change only marker presentation inside the Map view. Keep navigation, Flash, Request, search, filters, and all other pages unchanged.

## Changes
- Keep Google’s built-in POI interactions disabled and continue loading custom nearby-place labels only at close zoom.
- Track the current map zoom level.
- Always show the user-selected point, the draft request pin, active claimed live-stream bounties, and high-priority/gold bounties.
- At broad and neighborhood zoom levels, group ordinary bounty markers into compact count clusters instead of drawing every pin.
- Clicking a cluster zooms and centers the map onto that group.
- At zoom 14 and closer, expand clusters and show individual ordinary bounty markers.
- Prevent important markers from also appearing inside a cluster.

## Validation
- Verify broad zoom has low marker density while important and selected markers remain visible.
- Verify cluster clicks zoom in and individual markers return at close zoom.
- Confirm all existing map controls and bottom navigation remain intact on mobile and desktop.
- Run the focused type check.
