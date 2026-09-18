# Increase App-Wide Typography

## Goal
Raise text sizes throughout Onlooker by one consistent step for easier reading on phones and desktops, without changing the existing visual style.

## Changes
- Increase the shared typography scale so extra-small labels render at the current small size and body copy renders at the current base size.
- Scale card titles, section headings, and large display headings proportionally.
- Keep line heights comfortable and prevent the larger text from causing horizontal overflow.
- Verify representative mobile and desktop screens, including the Home map drawer and a content-heavy form.

## Technical Details
- Update the global Tailwind v4 typography tokens in the shared stylesheet rather than editing hundreds of individual components.
- Preserve existing semantic utility classes, font families, color tokens, and component hierarchy.
- Validate with the project type checker and browser screenshots at mobile and desktop widths.
