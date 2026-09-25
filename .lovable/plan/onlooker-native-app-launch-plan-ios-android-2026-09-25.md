# Onlooker Native App Launch Plan (iOS + Android)

Wrap the existing web app into store-ready Capacitor apps. No rebuild — the `ios/` and `android/` projects and `capacitor.config.ts` already exist (`com.onlooker.app`, loads onlookerlive.com). This plan turns that scaffold into submitted apps.

## Phase 0 — Pre-flight re-verification (before any store work, and again before submission)

- **Re-verify Apple's external-link/commission policy immediately before App Store submission.** The rules have changed repeatedly (Epic injunction, then a Dec 2025 Court of Appeals ruling partially reversed it, restoring a "reasonable commission" on external links). Do not rely on any snapshot understanding — check Apple's current guidelines and EU/US terms the week of submission.
- Confirm Google Play Payments policy is unchanged (currently: Stripe allowed for physical services and, in the US, alternative billing allowed).
- Confirm Apple Developer account ($99/yr) and Google Play Console account ($25) are registered and verified — verification alone can take days.

## Phase 1 — Native shell hardening (weeks 1–2)

- Build the `mobile-shell` webDir output and sync into `ios/` and `android/`.
- Wire Capacitor plugins for what the app already uses in the browser: camera/video capture, geolocation, push notifications, secure session storage, deep links (bounty/approval links must open in the app).
- Fix any browser-only assumptions (localStorage persistence inside the WebView, file uploads, back-button behavior on Android, safe-area insets on iPhone).
- Verify onboarding, cookie consent, sign-in, and the PIN/approval handshake inside the native shell.

## Phase 2 — Payments architecture (week 2–3)

- Bounties, escrow, hunter payouts: Stripe direct inside the app (physical-services exemption — no store IAP).
- Subscriptions (Observer/Hunter/Operative, Verified Visits Pro): purchase on the web at onlookerlive.com; the native app restores the existing account after sign-in. No Apple IAP integration.
- Gate any in-app "subscribe" buttons to open the web purchase flow (or hide purchase prompts on iOS if required by the then-current rules).
- Re-check the Phase 0 policy items before locking this in.

## Phase 3 — Store assets and listings (weeks 3–4)

- App icons and splash screens (already partially scaffolded — verify they meet current Apple/Google specs).
- Screenshots for required device sizes, privacy nutrition labels / data-safety forms (location, camera, payments data), store descriptions, keywords, age rating.
- Privacy Policy and Terms URLs already exist on the live site — link them in listings.

## Phase 4 — Closed testing (weeks 4–6)

- iOS: TestFlight internal then external testing.
- Android: Play Console closed track (Google requires new personal developer accounts to run a closed test with a minimum number of testers for ~2 weeks before production access).
- Real-device testing of the full money loop end to end: post bounty → claim → on-site approval/PIN → film → submit → poster review → payout, plus subscriptions and disputes.

## Phase 5 — Submission and review (weeks 6–8)

- **Re-run the Phase 0 policy re-verification the week of submission** (Apple external-link/commission rules especially).
- Submit to both stores; respond to reviewer questions (common for marketplace + payments apps: they may ask how escrow, disputes, and user safety are handled).
- Expected first-pass review: days to ~2 weeks; allow buffer for one rejection-and-fix cycle.

## Phase 6 — Launch and post-launch

- Production rollout (staged on Google Play), monitor crash reports and payment success rates.
- Set up release-key custody (Android keystore backup — losing it means never updating the app).
- Web app remains the primary surface; stores are an additional channel.

## Timeline

Realistic public launch: **6–10 weeks**, with payments policy interpretation and store review the biggest uncertainty — Phase 0 exists to manage exactly that.
