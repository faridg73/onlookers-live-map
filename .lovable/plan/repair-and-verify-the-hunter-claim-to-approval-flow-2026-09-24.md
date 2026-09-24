# Repair and verify the Hunter claim-to-approval flow

## Confirmed diagnosis

The final **“Yes, lock my claim”** action currently changes only the page’s temporary display state. It does not save a Hunter claim in the backend. The next refresh therefore sees the bounty as open again and restarts the confirmation sequence. The test bounty is still open, has no claim, and has no check-in recorded.

## Implementation

1. **Save the claim securely**
   - Add an authenticated claim action that records the signed-in Hunter against the real bounty ID.
   - Keep the existing backend protections: no self-claims, no expired/closed bounties, no duplicate winner, and escrow reservation for the successful Hunter.
   - Return a clear result for races or expired sessions rather than silently closing the dialog.

2. **Make the confirmation finish reliably**
   - Await the saved claim before closing the confirmation screens.
   - Disable the final button while saving so repeated taps cannot duplicate a claim.
   - Show a plain-language error if saving fails.
   - On success, refresh the bounty’s real state and immediately reveal **“I’m on site — request approval”** instead of reopening the claim prompts.

3. **Keep the real-estate approval flow intact**
   - Confirm the claimed Hunter alone can tap **“I’m on site — request approval.”**
   - Confirm that action sends the one-tap approval email to the property contact saved on this bounty: `faridson@gmail.com`.
   - Preserve the backup PIN, agent-decline, escrow, and payout rules unchanged.

4. **Regression coverage**
   - Test successful claim, double-click/retry safety, competing Hunter, Poster self-claim rejection, expired bounty, and failed-session messaging.
   - Check the affected screens on phone and desktop sizes.

5. **End-to-end test with the second account**
   - Sign into the preview as `apc4clean@yahoo.com` using the managed test session.
   - Open the existing real-estate bounty, complete both confirmations once, and verify the page lands on **“I’m on site — request approval.”**
   - Tap the on-site button and verify the backend records that Hunter and check-in, and that the approval email is accepted for delivery to `faridson@gmail.com`.
   - Ask you to tap **“Approve this onlooker”** in that email, then verify the Hunter’s page updates to **Verified on site** and filming is unlocked.
   - Report the exact final state and any remaining external limitation, including SMS campaign approval.

## Technical details

- Replace the local-only claim callback with an authenticated server action and real `claims` insert using the unprefixed bounty UUID.
- Let existing database validation and claim/escrow triggers remain the authority.
- Update the shared bounty state only after the backend confirms success, then reload the claimed bounty context needed by the on-site approval panel.
- Do not alter pricing, fees, escrow release, PIN verification, broadcast/post flows, or unrelated pages.
