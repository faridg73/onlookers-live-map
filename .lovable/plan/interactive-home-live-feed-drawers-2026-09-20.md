# Interactive Home live-feed drawers

## What will change
- Keep the five existing tab titles, colors, icons, and wording fixed: Live Emergency, High Bounty, Trending Stream, Recent Dispatches, and Hot Spot Near You.
- Turn each tab into a toggle that opens or closes one compact drawer directly beneath the ticker.
- Fill the drawer with a scrollable list filtered for the selected feed, using only active real items.
- Let each list item open its matching map pin, emergency detail, live player, or bounty detail; open bounties will also offer a clear Hunt action.
- Keep the existing empty-state message and Go Live/Post a Bounty actions inside the drawer when a feed has no active items.

## Interaction details
- Only one feed drawer can be open at a time; tapping the selected tab closes it.
- Opening a different tab switches the drawer content without changing the tab’s title.
- Use a short height/opacity transition with reduced-motion support and a stable maximum height so the Home layout stays controlled.
- The ticker animation pauses while the drawer is open so the selected toggle remains easy to track.

## Verification
- Check all five toggles on phone and desktop widths.
- Confirm every drawer is independently filtered and scrollable.
- Confirm map, player, detail, and Hunt destinations work without changing the locked Explore Nearby cards.
