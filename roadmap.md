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
- [ ] User switches nameservers at Namecheap to jule.ns.cloudflare.com / robert.ns.cloudflare.com; as of 2026-09-16 public DNS still shows dns1/dns2.registrar-servers.com, zone still pending.
- [ ] After activation: enable Under Attack Mode (security_level) and a rate-limiting / WAF rule on the free plan.
- [x] Closed a payout loophole: capture claims can no longer be self-approved; only the requester can approve.
- [ ] Cloudflare zone still "pending" — rechecks automatically; DNSSEC validation failure detected (likely stale DS record / DNSSEC on at Namecheap) — user to disable DNSSEC at Namecheap
- [ ] Once zone active: enable Under Attack Mode + rate limiting rule
