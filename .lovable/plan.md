# Profile progression and safety tutorial

## Changes
- Add reliable iPhone safe-area spacing to the Profile header.
- Rescale bounty progression to 10 XP per completion and 50 XP per level in both the interface and protected database award paths.
- Improve the Level 3 trust card contrast and continue deriving its points from live reputation data.
- Replace the instant tutorial reward with a short, step-by-step safety tutorial; award 10 points only after completion and show completed state thereafter.

## Technical details
- Add a database migration updating the protected XP helper and every current completion path to the new 10/50 scale, including existing XP/level normalization.
- Add a server-backed tutorial-completion lookup based on the existing unique reputation event.
- Keep reputation awards idempotent so reopening the tutorial cannot grant duplicate points.
- Verify the Profile on an iPhone-sized viewport and exercise the tutorial through completion.
