# Preserve feed and map navigation state

## What will change
- Keep TanStack Router’s existing page scroll restoration and add explicit session recovery for the Community and Explore feeds so returning users land at the same vertical offset.
- Persist Community view state: Feed/Map, impact tab, radius, category, subcategory, mystery mode, and category drawer state.
- Persist Explore’s Recent Clips/Global Feed tab and Browse Places’ Categories/Live Map tab plus selected map item.
- Save and restore map center and zoom after the user pans or zooms, without overriding an explicit “show on map” focus action.

## Implementation
- Add a small session-state utility with safe parsing and route-scoped keys.
- Initialize route state from session storage and write updates as controls change.
- Extend both map components with optional persisted viewport keys; save settled center/zoom and restore them when each map initializes.
- Avoid duplicate map resets caused by loading markers after a restored viewport.

## Verification
- Navigate away and back from scrolled feed positions and confirm exact restoration.
- Switch tabs and filters, navigate away, return, and confirm state remains selected.
- Pan and zoom each discovery map, navigate away, return, and confirm the viewport is restored on phone and desktop.
