# Pro Dashboard

## Goal
Create a dedicated, authenticated workspace for agents, property managers, and home builders to manage their Verified Visits from booking through escrow settlement.

## What will be built
- Add a focused **Pro Dashboard** page linked from Profile and the Verified Visits page.
- Show the professional identity, company, current paid plan, billing-period usage, remaining visits, and a clear upgrade action.
- Present live summary metrics for scheduled visits, active bounties, footage awaiting review, credits held in escrow, paid out, and returned.
- Organize saved visits into practical views: **Needs confirmation**, **Scheduled**, **In progress**, and **Completed**.
- Each visit row will show property, scheduled time, on-site contact, bounty state, deadline/countdown, escrow amount/status, and submitted footage count.
- Add contextual controls using existing secure flows: continue an unfinished booking, view or manage its bounty, cancel an eligible open bounty, and review submitted footage.
- Provide clean loading, empty, error, and signed-out states without exposing another user’s data.
- Keep the existing black, charcoal, white, and neon-lime visual system, optimized for phone and desktop.

## Technical details
- Extend the authenticated professional read function to return the user’s `pro_accounts` subscription data plus joined booking, request, claim, footage, and escrow snapshots as one dashboard-safe response.
- Keep all reads owner-scoped through authenticated server functions and existing row-level policies; never trust a user ID supplied by the browser.
- Use TanStack Query for loading, mutation state, and cache invalidation after actions.
- Subscribe to owner-relevant booking/request/claim/footage/escrow changes and refresh the dashboard when those records change, with cleanup on unmount.
- Reuse the existing bounty cancellation, footage review, countdown, and navigation flows instead of creating parallel money or escrow logic.
- Add focused tests for plan-limit calculations, visit-state grouping, escrow labels, and control visibility.
- Verify signed-out behavior, an authenticated professional account, mobile layout, desktop layout, and runtime errors. Full populated-state verification will require a professional test account with visits.

## Scope boundaries
- No pricing changes, new payment logic, new escrow rules, or changes to the PIN handshake.
- Existing non-professional Profile sections remain unchanged; the current compact Verified Visits block will become a concise entry point to the dedicated dashboard.
