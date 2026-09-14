# Strict login session isolation

## Goal
Ensure every email/password sign-in, registration, and social-login handoff can only load the profile belonging to the newly authenticated account. Keep each account’s existing profile data.

## Changes

### 1. Make session clearing deterministic
- Replace the broad best-effort cleanup with one shared account-switch reset.
- Stop token refresh while switching accounts, sign out locally, and remove every stored authentication-session key from both local and session storage before any new sign-in, sign-up, or social token exchange.
- Preserve unrelated app preferences while removing all authentication remnants.
- Clear account-scoped query data at the same boundary so the former profile cannot remain visible during the handoff.

### 2. Trust only the fresh authentication result
- Require email/password login to return a fresh session and take the account ID from `data.session.user.id`.
- Validate the newly returned access token directly with the authentication service, rather than asking the shared client for whichever session it currently considers active.
- Reject the handoff if the validated token ID, returned session ID, and returned user ID do not all match.
- Apply the same exact-token validation to immediately active registrations.
- Keep email-confirmation registrations signed out until their confirmation creates a real session.

### 3. Isolate social token exchange
- Clear the previous session before social login begins and again immediately before applying returned social tokens.
- Validate the returned social access token and reject any mismatched identity before the app proceeds.

### 4. Bind profile loading to the confirmed identity
- Pass the confirmed account ID through the post-login transition.
- Clear old queries, refresh the app’s account state, and navigate only after the new identity is verified.
- Keep profile and onboarding reads restricted to that ID; stale responses from another account remain discarded.
- Ensure accepting the Privacy Policy only records consent and never supplies or restores an account identity.

### 5. Regression checks
- Add focused tests for switching from one signed-in account to another, mismatched/stale session rejection, and signup without an immediate session.
- Run type checks and a browser smoke test covering: old account present → sign in with a different email → accept Privacy Policy → land on the second account’s profile.
- Confirm signing out and browser refresh cannot restore the former account.

## Technical details
- The fresh session’s access token becomes the source of truth for the handoff.
- `getUser(freshAccessToken)` verifies that exact token server-side; plain `getUser()` is not used to determine which newly authenticated account won the race.
- Existing profile rows, security answers, verification state, and onboarding fields remain unchanged and protected by their current per-user access rules.
