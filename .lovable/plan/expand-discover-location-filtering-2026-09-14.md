# Expand Discover location filtering

## Changes
- Expand the radius bar with 50, 100, 250, and 500 mile choices, with equivalent kilometer labels.
- Add an inline city or state search so people can move the filter center without sharing device location.
- Show the selected area in the filter label and preserve the selected radius between visits.
- Keep feed sorting, category filters, and map switching unchanged.

## Technical details
- Extend the shared radius definitions used by the Discover feed.
- Reuse the existing location lookup and saved browsing-area system.
- Calculate feed distance from either the user's device location or the searched area.
- Verify the filter bar and filtered feed in the browser at desktop and mobile widths.
