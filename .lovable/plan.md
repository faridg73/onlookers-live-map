# Full responsive and native-readiness audit

## Scope
- Inventory every user-facing route plus all dialogs, sheets, menus, post-flow states, settings, auth screens, maps, and shared navigation/footer surfaces.
- Exercise each reachable screen at 375px, 390–430px, 768px, 1024px, and 1280px+ widths, including signed-out and available signed-in states.
- Open interactive overlays and menus rather than checking only their closed triggers.

## Checks and fixes
- Detect horizontal scrolling, clipped or overflowing text, overlapping controls, unreachable tap targets, and content hidden by fixed navigation.
- Check image, video, and map proportions; modal centering and viewport limits; keyboard/short-height behavior; notch and home-indicator safe areas.
- Fix only responsive/layout defects found, preserving existing data, copy, workflows, and visual direction.
- Re-run the affected screens at all relevant widths after each grouped fix and check build/runtime diagnostics.

## Deliverable
- Provide a route-by-route and component-by-component report listing what passed, every defect found, every file/component changed, and any screen that could not be fully exercised because it requires unavailable external state.
- Separately confirm the native wrapper from project evidence and summarize the remaining store-submission punch list. The current configuration indicates Capacitor 8 for iOS and Android; this audit will verify the exact setup and distinguish completed work from physical-device/signing tasks.