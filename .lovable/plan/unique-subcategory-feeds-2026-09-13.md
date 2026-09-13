# Unique subcategory feeds

## What will change
- Give every subcategory its own curated sample posts with distinct titles, descriptions, and matching thumbnail artwork.
- Remove the generic “EXAMPLE” badge and present fallback items as polished topic cards without pretending they are user uploads.
- Make subcategory selection strict: a selected pill shows only matching real posts plus that pill’s tailored fallback content, never unrelated category posts.
- Reset the feed cleanly when switching categories or pills so the selected state and visible content update immediately.

## Technical details
- Replace generated template copy with an explicit content catalog keyed by category and subcategory.
- Add reusable topic-specific visual treatments using the existing Onlooker black, charcoal, and neon-lime design system.
- Simplify filtering so real posts remain authoritative while tailored fallback cards fill only the selected lane.
- Verify all Community subcategory pills in the browser and run the project’s type checks.
