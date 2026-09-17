# Roadmap

- [x] Fix live error on /community (Realtime channel reuse crashed the page for signed-in users)
- [x] Restore Browse tab in bottom nav; community hub now has its own "Meet" tab
- [x] Redesign Discover as an image-first social hub with visual categories and starter previews
- [x] Rebuild Post as a three-step conversational mobile wizard with venue suggestions and one deliberate nav entry
- [x] Save posted requests with their brief and capture length, and show every nearby live request from the database (not local memory)
- [x] Add unique topic artwork across Discover and fully populate Real Estate & Construction, Local Markets & Yard Sales, and Events & Performances
- [x] Add visual scroll indicators to horizontal category carousels
- [x] Fix database security warnings (revoked public EXECUTE on SECURITY DEFINER functions; tightened pool_contributions RLS; remaining signed-in warnings are intentional app-facing RPCs)
- [x] Add live city/state autocomplete dropdown to the Discover filter bar
- [x] Verify Turnstile checkbox renders on onlookerlive.com (confirmed live on /auth)
- [x] Show the Turnstile checkbox in the Discover post window before submission
- [x] Replace stale login routing with verified account handoff and user-ID-scoped profile loading
- [x] Enforce exact-token session isolation across password, registration, and social sign-in
- [x] Add preset bounty tiers and a custom-amount input to the "Happening here now" Flash modal with live USD equivalent

- [x] Flash "Happening here now" modal: format the bounty details box as structured badges (Capture Type, Camera Guidance, Instruction)
- [x] Make the Flash location editable with live place search and add concise alerting copy
- [x] Reduce Map marker clutter with zoom-aware POI visibility and smart bounty clusters
- [ ] Resolve Android signing secret mismatch: encoded keystore was entered as the password; identify/reset the correct signing credentials.
- [x] Reconnect Cloudflare connector with new scoped token, create zone, recreate all DNS records (A @/www proxied, Google + Lovable verification TXTs, SPF, MX, DKIM, notify Mailgun setup).
- [x] User switched nameservers and onlookerlive.com is active through Cloudflare.
- [ ] After activation: enable Under Attack Mode (security_level) and a rate-limiting / WAF rule on the free plan.
- [x] Closed a payout loophole: capture claims can no longer be self-approved; only the requester can approve.
- [x] Cloudflare zone activated and onlookerlive.com is serving as the primary domain.
- [ ] Once zone active: enable Under Attack Mode + rate limiting rule
- [x] Explain Onlooker accountability on Home, contrast standard apps in onboarding, and show real community earning impact.
- [x] Publish the current web build to onlookerlive.com.
- [x] Synchronize fresh Android v1.2 build 15 and iOS v1.2 build 30 release projects; automated signed store builds run from the configured release workflows.
- [x] Official trademark logo (onlooker-official-logo.png) — slogan recolored to neon lime
- [x] Restore standard Google Maps styling and roll out the official square eye logo across web and mobile.
- [x] Remove custom black and green dot markers from the map without changing its interface or app behavior.
- [x] Remove all red location pins from the map while leaving the standard Google Maps layout and app features untouched.

## Flash modal (Sep 16)
- [x] Minimum base 40 Credits ($10.00), tiers/conditions scale from it
- [x] Optional Instructions for Hunter field
- [x] Live chat widget on the active broadcast screen
- [x] Pro / Media Desk tier: mode toggle, pro-grade add-ons, escrow scaling
- [x] Mandatory legal release + indemnification checkbox gating Go Live on Pro tier

## Responsive layout audit (Sep 17)
- [x] Standardize shared page containers, discovery layouts, profile sections, grids, and overflow behavior across phone, tablet, laptop, and large desktop widths
- [x] Verify representative routes at iPhone, Android, iPad, laptop, and desktop viewport sizes
## Creator workflow update (Sep 17)
- [ ] Add creator vibe filters to Discover/Trending
- [ ] Add broadcast category tagging before going live
- [ ] Add creator stream history and analytics to Profile
