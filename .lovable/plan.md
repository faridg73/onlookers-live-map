# Media-rich local social feed on Discover

Turn Discover into a Twitter-style, image-first local stream with author identity, a tight
neighbourhood radius, and one-tap actions on every card.

## 1. Masonry card stream
- Two-column masonry on phones and up (single column only on very narrow screens), keeping the
  existing photo-or-gradient thumbnail at the top of each card.
- Denser card body: title, one-line note, place + distance, tags trimmed to two.
- Boosted posts stay first and span both columns so they read as featured.

## 2. Profile trust and verification
- Add the author's avatar (initial circle when none), handle-style name, verified check, and
  reputation level badge to the card, sitting just under the media.
- Reuse the existing reputation/verified lookup already used on the current cards, plus the
  Bronze→Elite level badge.

## 3. Hyper-local radius filter
- Ask for location once on Discover; default the feed to a tight radius (1 mi / 2 km) with quick
  choices for 5, 25 and Anywhere, shown in the viewer's own units.
- Posts with coordinates get a distance label and sort nearest-first inside the radius; posts
  without coordinates only appear on "Anywhere".
- If location is blocked or unavailable, the feed falls back to Anywhere with a short note and a
  retry button.

## 4. Action triggers on every card
- Row of compact actions: "Pin on map" (switches to the map view centred on that post), "Tip"
  (existing Credits tipping), "Watch live" / "Join stream" (existing pay-per-minute stream), and
  Share. Owner cards keep Boost and Delete.
- Map view accepts a focus post so the pin action lands on the right marker.

## Technical notes
- All work stays in `src/routes/community.tsx`, `src/components/CommunityPostCard.tsx`, and a small
  new `CommunityFeedFilters` piece; distance uses the existing `distanceMiles` helper, units use
  `use-distance-unit`, location uses `requestCurrentPosition`.
- Community posts already carry `latitude`/`longitude`, author name, avatar and level — no schema or
  backend change needed.
- Discover map view gains an optional focus target; global feed map behaviour otherwise unchanged.
