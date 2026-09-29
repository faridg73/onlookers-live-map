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

- Native releases use Capacitor 8 with remote `https://www.onlooker.io`; centralize native behavior in `src/lib/native.ts`.
- iOS creates and keys `UIWindow` before bridge layout; `native.ts` hides splash after fonts/first layout.
- Release automation preserves signed APK/AAB and IPA artifacts; iOS uses the decoded profile name.
- Starter-vibe editorial cards use `src/lib/starter-vibe-photos.ts` as the exclusive 4-photo-per-vibe registry so photo reuse cannot occur across vibe feeds.
- Non-Home pages rely on the root flex shell for height/nav clearance; route wrappers add neither.
- Venue lookups go through the shared `venue_cache` table, keyed by ~5 km area + query (6 h; stale on failure) — avoids per-visitor quota burn.
- Server Places/Geocoding calls Google directly with `GOOGLE_PLACES_SERVER_KEY`; browser map tiles use the restricted browser key.
- Profile photos use server-signed avatar paths; the avatars bucket stays private.
- Google Maps geocoding and autocomplete treat provider 429 responses as temporary unavailability and pause retries for 15 minutes — prevents recoverable quota exhaustion from crashing the app.
- Email/password signup is completed server-side only after one-time email and phone proofs match the submitted values; this prevents bypassing the inline verification gates.
- Payout-change wait is 24h for live payout accounts and 2 min only for sandbox (test-money) accounts, decided in the database — lets preview testing run in one sitting without weakening production.
- Money-moving server functions record the caller's IP plus a hashed device signature into `account_signals`, and `accept_bounty_video` calls `flag_bounty_self_dealing` after payout — self-dealing is detected at settlement without blocking honest approvals.
- Profile activity uses authenticated user-owned records only; never show examples as account history.
