# Contextual photos for Browse Places

## What will change
- Load each venue’s real place photo in the Browse Places lists, trending strip, and venue detail page.
- Replace category gradient/emoji panels with high-quality representative photography matched to each category.
- Use a neutral, photo-style fallback only when a live venue has no available photo; avoid repeated generic icon bubbles.
- Preserve the current black, charcoal, and neon-lime Onlooker visual system.

## Implementation
- Reuse the existing batched place-photo lookup and session cache for live venue results.
- Add a shared venue thumbnail component so loading, image crop, accessibility text, and fallback behavior stay consistent.
- Add one representative image per discovery category and map those assets by category slug.
- Update the Browse Places home, category result lists, trending cards, and venue detail page to use those visuals.
- Validate desktop and mobile layouts in the running app, then check the relevant security findings.
