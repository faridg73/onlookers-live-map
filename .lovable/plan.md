# Home Live Stage Redesign

## Goal
Turn Home into a high-impact first impression that immediately communicates Onlooker’s three core experiences: live streams, emergency reports, and local bounties—without disrupting the existing map, Explore Nearby drawer, or posting flows.

## What will change
- Add a bold full-width live-stage introduction over the map using the existing black, charcoal, neon-lime, and emergency-red design system.
- Add a compact moving activity ticker sourced only from current bounty/report/live data; empty states remain honest and no sample media is introduced.
- Surface real live/local activity in a focused preview with clear actions to watch, open the map item, or explore the feed.
- Move the existing “Go live” and “Post a Bounty” actions into the first-screen focal area while preserving their current destinations and behavior.
- Keep map search, map style controls, Explore Nearby, categories, and all existing dialogs functional and accessible.
- Use high-impact editorial typography, staged entrances, live-state pulses, and a ticker motion pattern with reduced-motion fallbacks.
- Adapt the composition for phone and desktop so controls do not collide with safe areas, map controls, or bottom navigation.

## Technical details
- Refactor the Home route into small presentation pieces for the intro, ticker, and real-activity preview while reusing the existing request/filter state.
- Add semantic font and motion tokens in the global design system; load Archivo Black and Hind through the document head.
- Preserve session-restored drawer, filter, map viewport, and scroll behavior.
- Verify the Home screen and primary actions at phone and desktop sizes, including empty/live-data states and console errors.
- Confirm Home retains its unique page metadata and update its description only if needed to reflect the new first-screen message.
