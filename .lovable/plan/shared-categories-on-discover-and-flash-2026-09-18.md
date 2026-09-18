# Shared Categories on Discover and Flash

## Goal
Use the same 16-category dropdown and dynamic vibe pills from broadcast creation across Discover and Flash.

## Changes
- Replace the limited creator-vibe controls at the top of Discover with the shared category picker.
- Filter Discover feed and map data by the selected category and selected vibe, with a clear all-content state.
- Add the shared category picker to the Flash request form.
- Save the selected Flash category and vibe in the request details, and use the category when adding the live request locally.
- Keep current location, radius, escrow, safety, and broadcast behavior unchanged.

## Technical details
- Extend the shared picker with context labels and an optional “All categories” state so browsing language differs from creation language.
- Reuse `broadcast-categories.ts` as the single source of category/subcategory definitions.
- Pass filtered Discover posts into both the feed and map so both views match.
- Extend `FlashBountyOptions` with category and subcategory metadata without changing pricing.
- Verify Discover and Flash at mobile and desktop widths, including empty results and category switching.
