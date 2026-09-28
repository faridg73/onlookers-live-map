<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Native releases use Capacitor 8 with a remote `https://www.onlooker.io` WebView shell (non-redirecting host, or Capacitor hands the load to Safari); keep native behavior centralized in `src/lib/native.ts` so web behavior stays unchanged.
- iOS `SceneDelegate` must create the `UIWindow` and make it key before the bridge view controller loads its view, and the splash screen is hidden from `src/lib/native.ts` after fonts/first layout, so a cold launch never paints at the storyboard's legacy width.
- Release automation must preserve a signed Android APK/AAB and an iOS IPA artifact; iOS signing uses the decoded profile name explicitly so CI does not depend on a developer machine.
- Starter-vibe editorial cards use `src/lib/starter-vibe-photos.ts` as the exclusive 4-photo-per-vibe registry so photo reuse cannot occur across vibe feeds.
- Non-Home pages rely on the root flex shell for usable viewport height and fixed-bottom-nav clearance; route wrappers must not add their own full-screen height or bottom-nav padding, preventing dead space on short pages.
- Venue lookups go through the shared `venue_cache` table, keyed by ~5 km area + query (6 h; stale on failure) — avoids per-visitor quota burn.
- Server-side Places/Geocoding calls hit Google directly with the `GOOGLE_PLACES_SERVER_KEY` secret, never the Lovable `google_maps` connector gateway (shared 6,000/day cap). Browser map tiles keep the browser-restricted connector key.
- Profile photos are signed server-side by `signAvatarPaths` (only files currently set as a profile avatar); the avatars bucket has no public read rule — keeps photos public without exposing the bucket.
- Google Maps geocoding and autocomplete treat provider 429 responses as temporary unavailability and pause retries for 15 minutes — prevents recoverable quota exhaustion from crashing the app.
- Email/password signup is completed server-side only after one-time email and phone proofs match the submitted values; this prevents bypassing the inline verification gates.
- Payout-change wait is 24h for live payout accounts and 2 min only for sandbox (test-money) accounts, decided in the database — lets preview testing run in one sitting without weakening production.
