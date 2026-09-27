# Fix short-page spacing above bottom navigation

## Goal
Remove the large empty band on short pages, including the real estate Pro dashboard, while keeping long pages scrollable and all content clear of the fixed five-button navigation.

## Changes
- Make the shared non-Home page wrapper fill exactly the usable viewport above the fixed bottom navigation.
- Let the main content area grow on short pages so the footer settles immediately above the navigation instead of leaving dead space.
- Keep the existing navigation clearance in one shared place and remove the Pro dashboard’s conflicting full-screen and duplicate bottom-padding rules.
- Preserve Home’s full-screen treatment and embedded pages, which do not use the shared footer/navigation layout.
- Check other short routes that use the same shared shell to ensure the fix is systemic rather than Pro-specific.

## Verification
- Test the Pro dashboard and representative short pages at the current phone size and common iPhone/Android viewport sizes.
- Confirm the footer sits directly above the bottom navigation, long content still scrolls, safe-area spacing remains intact, and no content is hidden.
- Confirm the preview build has no errors.

## Technical details
Use dynamic viewport height and the measured `--bottom-nav-height` already maintained by the navigation. The shared wrapper will be a vertical flex layout with a growing `main`; route content will no longer create an additional full viewport inside that wrapper.
