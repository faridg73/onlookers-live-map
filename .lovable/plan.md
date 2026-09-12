# Fix the map’s nearby bounty experience

## What will change
- Keep the app opening directly on the Map tab and center the map on the user when location access is available.
- Move the zoom and recenter controls below the phone’s safe top area so the `+` and `−` buttons remain fully visible and aligned.
- Turn the Onlooker/live-request header into a clear tappable control.
- When tapped, open a compact nearby-bounties panel showing only active requests within 5 miles, ordered nearest first and then by payout.
- Make each nearby request selectable so tapping it focuses its map pin and opens its bounty details.
- Replace the remaining “within 5 km” wording with “within 5 miles.”
- Show a useful empty state when location is unavailable or no active bounty is within five miles.

## Technical details
- Share the user’s live coordinates from the map with the map page.
- Convert stored pin positions to coordinates and calculate straight-line distance in miles with the Haversine formula.
- Use safe-area-aware positioning for Android/iPhone map controls.
- Preserve existing bounty, payment, authentication, and map-pin behavior.

## Verification
- Check the map at a phone-sized viewport.
- Confirm the zoom controls are fully visible and aligned.
- Confirm the header opens and closes the five-mile request list.
- Confirm choosing a request opens the matching map bounty card.
- Confirm all nearby radius text uses miles.
