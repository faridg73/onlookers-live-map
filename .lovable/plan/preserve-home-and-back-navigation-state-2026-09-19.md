# Preserve Home and Back-Navigation State

## What will change
- Open the Home “Explore nearby” panel by default for first-time visits.
- Remember an explicit collapse or expansion for the rest of the browser session, so navigation does not reset it.
- Preserve the Home panel’s internal scroll position, selected category, map filter, and map viewport when leaving and returning.
- Add session-backed route scroll recovery at the shared app level so ordinary pages return to their prior position, while retaining the existing richer Community, Explore, and Discover state restoration.
- Make delayed feed content restoration resilient so async-loaded pages settle at the saved offset instead of jumping upward.

## Verification
- Test Home expansion/collapse persistence after navigating away and back.
- Test exact scroll recovery on a long feed and a normal sub-page.
- Confirm Community/Discover view filters and map state still restore without console errors.
