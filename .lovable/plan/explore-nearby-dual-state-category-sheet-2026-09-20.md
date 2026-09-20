# Explore Nearby dual-state category sheet

## Scope
Update only the Home page’s **Explore Nearby** section. Preserve the map, header, search, live stage, routing, category behavior, and all 17 locked category cards exactly as they are.

## Changes
- Make the default state a compact Explore Nearby bar with a prominent neon-green expand chevron.
- Expand the bar into a polished bottom sheet containing the complete 17-card category grid.
- Support tap, dismissal, and vertical drag gestures with spring-like movement and stable collapsed/expanded snap states.
- Keep the expanded sheet scrollable and safely positioned above bottom navigation on phones and desktops.
- Preserve every existing category action, selected-category detail view, card artwork, count, ordering, and map-filter behavior.
- Respect reduced-motion settings with an immediate, non-animated transition.

## Technical details
- Keep the implementation local to `src/routes/index.tsx` and reuse the existing button system and semantic neon theme tokens.
- Use pointer-driven sheet translation with requestAnimationFrame-friendly transforms during dragging, then settle through a tuned spring-style CSS transition.
- Use fixed state dimensions and transform/opacity animation to avoid reflow-heavy frame-by-frame layout work.
- Maintain keyboard controls and accessible expanded/collapsed labels.

## Verification
- Check the compact default, tap expansion, drag expansion/collapse, dismissal, sheet scrolling, and all 17 cards on phone and desktop sizes.
- Confirm category actions still filter/open the same content and no map, header, routing, or other Home styling changes.
