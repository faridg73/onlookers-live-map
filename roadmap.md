# Roadmap

- [x] Contact page: close (X) button in header — routes back to previous screen (verified; browser-history back with home fallback)
- [x] Contact page: "Contact & Support" heading all lime green
- [x] Contact page: header title + subtitle centered, font size reduced
- [x] Home storefront: premium charcoal glass canvas, electric-lime actions, and real-data discovery rail

- [x] Responsive audit: trending dropdown pinned to viewport (flips above row), Home stage scrolls within viewport on short screens
- [x] Publish updated version
- [x] Home: remove map canvas and use premium charcoal glass background; restore standard road maps globally
- [x] Navigation: remove the top-right logo globally and show the secondary menu only on Profile

## Ticker readout
- [x] Make LIVE/ALERTS/BOUNTIES/TOP POOL ticker items clickable
- [x] Move ticker readout under "The city is live" line

## In progress
- [x] Home Pro card: route established signed-in professional accounts to Pro Dashboard; send signed-out and first-time accounts to verification onboarding
- [x] Posting flow: add an inline credit top-up action, resume the exact bounty step after payment, and keep phone alerts below status bars
- [x] Live viewing: fix the ambiguous minutes-billed error shown to viewers
- [x] First-visit cookie consent: accept/decline persistence, optional diagnostics gate, privacy disclosure, mobile/desktop verification
- [x] First-open mobile onboarding: signed-out completion, account sync, browsable CTAs, replay-safe persistence, and four-case preview verification
- [x] Pro Dashboard: subscription tier, monthly usage, saved visits, bounty controls, live escrow tracking
- [x] Percentage-based visibility boost pricing in Step 3 (Fast Catch = 50% of reward, min 10 Cr; Priority Hunt = 100%, min 20 Cr; total escrow = reward + boost) — math unit-verified, type-check clean
- [x] Verify boost pricing + dynamic Privacy & access copy (signed-in wizard pass confirmed by user)
- [x] Poster bounty dashboard inside Profile (tabs: Open / In progress / Settled, escrow + payout totals, cancel + footage review)
- [x] Visible auto-close/settle countdowns on poster bounty dashboard cards
- [x] Required resolution note on dispute decisions, stored with the case and shown for repeat disputes
- [x] Specific upload/submission error messages, automatic retries, 10-minute submission grace buffer (escrows.submission_started_at + begin_bounty_submission), and a persistent "Submission failed? Contact support" link on every capture screen
- [x] Trip-value row on bounty cards (distance, travel time, payout, est. hourly)
- [x] Hunter search distance fully adjustable (Anywhere default, presets, uncapped custom); alert radius cap removed; confirmed no backend distance limit
- [x] PIN handshake: expiry + single use, resend to agent, onlooker unreachable report (trip fee via dispute), account-free agent decline link with refund + kill fee

## Native app launch (Capacitor iOS/Android)
- [x] Phase 1 (in-repo): native bridge (deep links appUrlOpen → in-app nav, Android back button → router history), Android https App Links intent filter, iOS App.entitlements (associated domains), /.well-known/apple-app-site-association + assetlinks.json templates, cap sync green, build OK
- [x] Native-feel release hardening: no browser chrome/reload gestures, full safe-area coverage, iOS swipe-back, native keyboard resizing, and native system-bar styling
- [x] Responsive release matrix: verify Home gold Pro card, Explore by Vibe, bottom navigation, dialogs, and text-entry flows at iPhone SE, standard iPhone, Pro Max, Android phone, and Android tablet sizes
- [x] Asset-density audit: verify complete iOS AppIcon set and Android mdpi–xxxhdpi launcher/splash assets with no low-resolution fallbacks
- [ ] Native release evidence: browser matrix passed; signed TestFlight/Internal Testing checks remain blocked until those builds are installed on physical devices
- [x] Fill app-link identities: Apple Team ID + both active iOS bundle IDs in AASA, Android release SHA-256 in assetlinks.json
- [x] Link the Associated Domains entitlement into both Xcode build configurations and set the signing team
- [ ] Phase 1 remaining: native camera/geolocation/push plugins, generate Android release keystore, build binaries on a Mac
- [ ] Phase 2 payments: Stripe in-app for bounties/escrow; web-first subscriptions with account restore
- [ ] Phase 0 re-verify: Apple external-link/commission policy the week of submission (Dec 2025 ruling — rules keep changing)
- [ ] User action: register Apple Developer ($99/yr) + Google Play Console ($25) accounts
- [x] Wallets: Apple Pay + Google Pay enabled on all payment configs (sandbox+live), Apple Pay domains registered (both modes), association file in public/.well-known — needs publish so Apple can verify onlookerlive.com; verified live checkout mounts Stripe Express Checkout wallet strip
