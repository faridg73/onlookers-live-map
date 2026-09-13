# Conversational Post Wizard

## Goal
Replace the crowded request form with a focused, mobile-first posting sheet that uses Onlooker Live’s exact dark palette, understands a natural-language request, suggests relevant public venues, and preserves the existing escrow, moderation, permissions, map pin, deadline, and request-submission behavior.

## What will change

### 1. Exact visual system
- Update the shared semantic colors to the requested palette: canvas `#0A0A0A`, elevated surfaces `#141414`, neon lime `#CCFF00`, primary text `#FFFFFF`, metadata `#9CA3AF`, and borders `#262626`.
- Apply those tokens consistently to the new post sheet, its search field, choices, map, progress indicator, and review state without introducing one-off colors.

### 2. One deliberate mobile entry point
- Remove the floating camera/post button from the map and retire the legacy quick-post dialog from that screen.
- Turn the bottom navigation item into the emphasized center `+ POST` action.
- Open posting as a full-height mobile bottom sheet with a backdrop, scroll lock, safe-area spacing, and an explicit close control; desktop receives a centered sheet-sized dialog using the same content.
- Keep `/post` available as the shareable/deep-link destination, but render the same wizard rather than a separate form.

### 3. Conversational request parsing
- Replace the opening fields with one prominent prompt such as “I want a 5-minute live clip of Neiman Marcus at Fashion Island.”
- Add a deterministic parser that extracts likely venue, place context, action type, and duration without sending private text to a new external AI service.
- Show the detected details as editable confirmation chips so users can correct an imperfect match before continuing.
- Preserve moderation and convert the parsed intent into the existing request title and camera instructions.

### 4. Venue-first location selection
- Add debounced, app-owned venue suggestions backed by the existing Google Places connection; no browser Places widget will be introduced.
- Add quick filters for malls/retail, parks/outdoors, education, and community hubs.
- Seed the requested high-interest Orange County examples—Fashion Island, South Coast Plaza, Neiman Marcus, Nordstrom, Bloomingdale’s, Orange Coast College, and Santiago Canyon College—as fast searches, while regional venue types resolve near the user.
- Selecting a venue immediately anchors the existing draggable map pin and stores its formatted address and exact coordinates.

### 5. Three progressive steps
- **Step 1 — Describe:** natural-language request, smart suggestions, and detected intent.
- **Step 2 — Choose place:** venue results, category filters, and exact pin confirmation.
- **Step 3 — Choose action:** Go Live Now, Request Video Clip, or Flash Meetup, followed by a compact review for Credits, deadline, instructions, and any required permission or access code.
- Keep Back/Continue controls stable at the bottom of the sheet without covering scrollable content.

## Technical details
- Reuse the current request submission sequence: validation → wallet check → escrow lock → request creation → Feed navigation.
- Reuse the existing map/geocoding connection, live camera security rules, 4 Credits = $1 display, deadline expiry, moderation modal, category safeguards, access code, and permission confirmation.
- Add a bounded backend venue-search function with input validation, debouncing, result limits, and clear Google Maps error messages; avoid unrestricted public proxy behavior.
- Keep post state in the shared wizard so closing, reopening, or moving between steps cannot accidentally submit or duplicate a request.

## Validation
- Verify the bottom `+ POST` action is the only general post trigger and the map has no floating post button.
- Verify the sheet locks background interaction, scrolls internally, respects safe areas, and closes deliberately on iPhone/Android-sized viewports.
- Test parsing for venue, location, clip/live/meetup intent, and durations including 5 minutes, 30 minutes, 1 hour, and 24 hours.
- Test venue filters, named venue suggestions, current location, map tap, pin drag, and exact coordinate storage.
- Test all three action choices, escrow shortfall, moderation, permission/access-code requirements, deadlines, and successful Feed navigation.
- Run focused type checks and browser checks at mobile and desktop sizes.