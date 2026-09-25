# Cookie consent and privacy controls

## Experience
- Add a compact first-visit banner in Onlooker’s black, charcoal, and neon-lime style.
- Explain that essential storage supports sign-in, security, and saved preferences, while optional analytics and diagnostics require permission.
- Provide equally accessible **Accept optional cookies** and **Decline optional cookies** choices, plus a Privacy Policy link.
- Save the choice locally so the banner stays dismissed on later visits.

## Consent enforcement
- Treat authentication, security, legal acceptance, onboarding state, and user-selected app preferences as essential functionality.
- Default optional consent to denied until the visitor explicitly accepts.
- Expose a shared consent utility and event so any current or future analytics/diagnostic integration can check consent before loading or recording.
- Gate the app’s optional client-side diagnostic reporter behind accepted consent; no advertising trackers are currently installed.

## Verification
- Test a brand-new browser: no optional consent before a choice, banner visible, and both choices dismiss it.
- Test repeat visits for both accepted and declined states.
- Confirm the Privacy Policy remains reachable and the banner fits mobile and desktop without covering primary controls.
- Confirm the app builds without errors.
