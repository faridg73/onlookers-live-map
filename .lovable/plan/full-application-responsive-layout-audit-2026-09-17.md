# Full-application responsive layout audit

## Goal
Make the application fill each device cleanly without horizontal scrolling, clipping, or layouts that remain phone-width on tablets and desktops.

## Changes
- Introduce consistent fluid page-container patterns: full width, responsive side padding, and wider content limits for tablets, laptops, and large monitors.
- Update profile, discovery, feed, hunt, balance, pools, support, legal, and related content pages to use those shared responsive widths while retaining focused reading widths for forms and legal text.
- Convert repeated one-column lists into responsive grids where the content supports it: one column on phones, two to three columns on tablets, and additional columns on wider desktops.
- Harden headers, action rows, tabs, navigation, cards, tables, maps, modals, and full-screen broadcast/post views against overflow using shrink-safe text containers and stable controls.
- Keep the Home map genuinely full-screen and preserve safe-area spacing for iPhone and Android navigation bars.
- Add global safeguards for viewport width, media sizing, and accidental horizontal overflow without hiding legitimate horizontal carousels.

## Verification
- Check representative screens at phone, tablet, laptop, desktop, and large-monitor widths.
- Confirm there is no document-level horizontal scrolling, important text is not clipped, cards reflow correctly, and fixed navigation remains usable.
- Run the project’s type validation and inspect the relevant pages in the live preview.

## Technical details
- Use Tailwind’s fluid utilities (`w-full`, `min-w-0`, responsive `max-w-*`, responsive grids) and existing semantic design tokens.
- Keep narrow limits only where line length or form usability benefits from them; use wider outer shells with constrained inner reading columns when appropriate.
- Preserve the existing viewport metadata, including `viewport-fit=cover`, and add global `min-width: 0`/media constraints where needed.
