# First-open mobile onboarding carousel

## Scope
Replace the existing account-only walkthrough with a three-slide introduction that appears on the first app open, including for signed-out visitors. Keep the current black, charcoal, and neon-lime Onlooker style and leave posting, claiming, messaging, and account flows unchanged.

## Experience
- Build three benefit-led slides:
  1. **Get paid to be someone's eyes nearby** — discover nearby bounties and earn by capturing requested proof.
  2. **Post a task, get verified proof back** — request a real-world check and receive evidence from someone nearby.
  3. **Your money's protected either way** — explain held credits, on-site PIN/identity verification, and real dispute review.
- Support horizontal swipe gestures, accessible previous/next controls, tappable progress dots, and a persistent top-right **Skip** action on every slide.
- End with two equal choices: **Post a bounty** opens the bounty posting flow and **Start earning** opens the bounty discovery experience. Neither requires sign-up until the user takes a protected action.
- Keep the presentation compact and safe-area aware on small phones, with reduced-motion support.

## Persistence
- Save completion immediately in local storage for signed-out first-time visitors.
- When a viewer is signed in, read the account's existing onboarding flag. If the device has already completed the introduction, copy that completion to the account; if the account has already completed it, copy that state to the device.
- Preserve the existing manual replay action without accidentally resetting the saved account state when the replay is only for review.

## Verification
- Check first-open, Skip, swipe, dot navigation, final actions, and repeat-open behavior on a mobile viewport.
- Check signed-in synchronization behavior and confirm the introduction does not replace the browsable Home screen with a sign-up prompt.
- Confirm the preview builds without errors.
