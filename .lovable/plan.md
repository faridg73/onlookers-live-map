# Instant Micro-Live Preview Cards

## Goal
Replace static media surfaces with short, silent previews using real uploaded videos only. Keep existing thumbnails and animated placeholders when no video is available.

## Changes
- Update the shared preview player to loop only a four-second segment while visible, pause off-screen, restart cleanly, stay muted, and respect reduced-motion settings.
- On Discover category tiles, select the newest real video posted in each category; retain the category artwork when no category video exists.
- Use the same micro-preview behavior on Discover post cards and Recent Captures cards.
- Update Explore clip cards so the video softly previews before tapping, while a tap still opens normal playback controls and counts the view.
- Add clear visual treatment for preview state without changing existing feed actions or playback behavior.

## Technical details
- Derive category preview URLs from the already-loaded community posts and signed media URL map; no new storage or sample media.
- Add an optional preview-duration setting to the shared `LoopingPreview`, defaulting to four seconds.
- Reset playback to the start of the preview segment on `timeupdate`/`ended`, and only autoplay when intersecting the viewport.
- Validate with the existing typecheck and browser checks on Discover and Explore at mobile and desktop widths.
