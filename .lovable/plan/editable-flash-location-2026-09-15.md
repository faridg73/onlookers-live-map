# Editable Flash Location

## Scope
Update only the “Happening here now” Flash feature.

## Changes
- Replace the read-only GPS location display with an editable location search field.
- Pre-fill the field from the device’s current GPS lookup when available.
- Let users type, clear, search, and select a city, landmark, venue, or address.
- Store the selected place name and coordinates for the funded Flash bounty.
- Show an immediate location error if typed text has not yet resolved to a valid place.
- Replace the current description under the title with: “Instantly alerts nearby onlookers to go live at this exact spot.”
- Add the same explanation as a desktop tooltip on both Flash launch buttons.

## Validation
- Check location selection, clearing, GPS fallback, and invalid-location feedback.
- Verify the popup fits and remains usable on a mobile viewport.
- Run the focused type check.
