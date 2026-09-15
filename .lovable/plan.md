# Home map and action sheet

## Scope
Update only `src/routes/index.tsx`. Shared navigation, Flash controls, map component, and every other page remain unchanged.

## Changes
- Keep the Home map full-screen and use its existing white, POI-suppressed roadmap with dark high-contrast map markers.
- Simplify the Home overlay so the map remains the visual focus.
- Replace the current lower Home controls with a compact three-row action sheet:
  1. **What would you like to see?** expands and collapses smoothly.
  2. **Live Stream** opens the existing live-stream creation flow.
  3. **Post a Bounty** opens the existing bounty-posting flow.
- Add three choices inside the expandable row: **Local Bounty Map**, **Community Vibe**, and **Learning & Guides**.
- Make **Local Bounty Map** expose real-time map filters for all, live, nearby, and high-bounty requests; the other choices open their existing destinations.
- Keep the sheet above the existing bottom navigation without changing that navigation.

## Verification
Check the Home page at mobile and desktop sizes, including sheet expansion, filter updates, map interaction, and navigation targets.
