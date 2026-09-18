# Responsive home map search and drawer

## Goal
Make the Home map easier to use on phones and desktops with an unobtrusive floating search control and a bottom drawer that keeps recent places and the main bounty action within reach.

## Changes
- Keep the map full-screen and place a floating search pill at the top, respecting phone safe areas and expanding into the existing place autocomplete.
- Replace the current stacked lower panels with one collapsible bottom drawer above the navigation.
- Add a visible drag handle and support tap plus vertical drag gestures to switch between collapsed and expanded states.
- Show recent searched or selected places from the existing search history, with one-tap map recentering and a clear empty state.
- Keep the existing map filters and supporting Home actions inside the expanded drawer without changing their destinations.
- Make **POST A BOUNTY** the persistent primary action in the drawer.
- Use a compact mobile sheet and a constrained desktop panel so map pins remain visible at every width.

## Verification
- Check the Home map on phone and desktop widths.
- Confirm search expansion, autocomplete selection, recent-place selection, drawer drag/tap behavior, map filtering, and the bounty action.
- Confirm no horizontal overflow and that the drawer stays above the bottom navigation and device safe area.

## Technical details
- Reuse `PlaceSearchInput`, `readRecentPlaces`/`rememberRecentPlace`, existing semantic colors, and the current Home navigation actions.
- Implement pointer-driven drawer movement with stable collapsed/expanded snap points and reduced-motion-friendly transitions.
- Keep all work scoped to the Home map presentation and its existing interactions.
