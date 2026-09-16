# Accountability, onboarding, and community impact

## Scope
Update the existing Home, first-run onboarding, and Community screens. Keep the current black, charcoal, and neon-lime Onlooker design, the live map, navigation, and real user media unchanged.

## Changes
- Add a compact Home introduction above the action sheet that explains Onlooker’s real-world accountability model: post a bounty, lock credits, receive verified proof, then release payment. Keep it collapsible so the map remains usable on small screens.
- Rework the first-run onboarding into a clear three-step contrast:
  1. Standard video apps: casual conversation with no task or stake.
  2. Onlooker network: a real request backed by credits held safely.
  3. Verified result: proof is reviewed before credits are released.
- Add a Community Impact section near the top of Community with two views:
  - **Help others earn**: current open bounty opportunities and a direct path to the bounty map.
  - **My impact**: signed-in account earnings and completion information from existing real data, with a sign-in state when unavailable.
- Explain the earning flow beside those views: claim, capture, requester verifies, credits release. Do not invent user totals or show mock content.
- Update Home and Community page metadata to match the accountability and verified-earning message.

## Technical details
- Reuse existing design tokens, Button components, request state, wallet/earnings functions, and authentication state.
- Keep all new interface states accessible, keyboard-friendly, and compact across phones, tablets, and desktop.
- Add no new backend tables or policies; this work uses data already available in the app.

## Verification
- Check Home at phone and desktop sizes with both the explainer and action sheet opened and closed.
- Check the first-run onboarding sequence for readable contrast and completion behavior.
- Check Community signed-out and signed-in states, both impact tabs, real totals, navigation targets, and narrow-screen overflow.
