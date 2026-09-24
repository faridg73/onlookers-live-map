# Verified Visits booking persistence

## Goal
Save every valid scheduled-visit form submission immediately, then let the professional finish payout and publish the bounty without losing the booking. Show both unfinished and published visits on their Profile dashboard.

## Booking flow
1. A signed-in professional completes the Verified Visits form.
2. Submission creates a private booking record with the property, visit instructions, preferred time, and on-site contact.
3. The app opens the existing bounty form with those details prefilled and Real Estate selected automatically.
4. After payout confirmation creates the bounty, the booking is linked to it and changes from **Needs confirmation** to the bounty’s live status.
5. If the professional leaves before confirming, the saved booking remains on their dashboard with a **Continue setup** action.

## Professional dashboard
Add a **Verified Visits** section to Profile for professional accounts only. It will show:
- Property and scheduled date/time
- On-site contact
- Status: Needs confirmation, Open, In progress, Completed, Cancelled, or Expired
- **Continue setup** for drafts
- **View bounty** for published visits
- Clear empty, loading, and error states

## Database and security
- Add a `pro_visit_bookings` table for booking drafts and their optional linked bounty.
- Grant access explicitly, enable row-level security, and restrict reads/writes to the signed-in owner.
- Validate booking creation and linking in authenticated server functions rather than trusting browser-supplied user IDs.
- Keep existing bounty escrow, PIN delivery, visit allowances, and payment confirmation unchanged.

## Code changes
- Add booking server functions for create, list, resume, and link-to-bounty operations.
- Extend the handoff draft with its booking ID.
- Update the Verified Visits form to save before navigating.
- Fix the handoff so the bounty form always selects Real Estate and preserves the address.
- Link the saved booking after the bounty is successfully created.
- Add the professional dashboard section to Profile.

## Verification
- Test saving a booking, leaving before confirmation, resuming it, and publishing it.
- Confirm only the owner can read or update a booking.
- Confirm the dashboard reflects draft and live bounty statuses on phone and desktop.
