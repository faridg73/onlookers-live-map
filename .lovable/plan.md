# Trust Tiers, Reputation & the Community Report Form

Four connected pieces: a 3-level trust system, reputation points for helpful everyday actions, a new "Create Community Report" form styled like your mockup, and a legal gate that keeps the submit button locked until people accept the false-report warning.

## 1. Three trust levels

Levels are worked out from information already on an account, so nobody has to be graded by hand:

- **Level 1 — Reader / Flagger**: signed in. Can read, flag and validate, cannot post emergency reports.
- **Level 2 — Provisional Contributor**: phone confirmed, or has earned some reputation. Can post ordinary reports.
- **Level 3 — Verified Creator / First Responder**: verified mark on the account (phone-verified creator), or an ambassador/first-responder seeded by an admin. Only Level 3 can file emergency and live-alert reports.

A badge on the profile shows the current level, what it unlocks, and the single next step to reach the level above.

## 2. Reputation points

A new reputation record logs points for passive, low-risk help:

- Flagging a post as outdated
- Validating a traffic or incident marker as still accurate
- Finishing the safety tutorial (one-time)

Points are awarded by the backend, once per action per item, with daily caps so nobody can farm them. Regional ambassadors can be seeded with a starting balance and a first-responder flag by an admin only.

## 3. "Create Community Report" form

A full-screen dark neon panel matching the mockup, with the back arrow / title / close header and these blocks:

1. **Incident type** — dropdown plus the six-icon grid: Fire, Police, Medical, Traffic, Hazard (and a general option).
2. **Creator authentication** — toggle for "Require Verified Creator Badge Only" replies.
3. **Photo / video upload** — opens the existing camera + upload flow, shows the thumbnail while it uploads.
4. **Geo-radius status** — live radius readout (500m default) with a slider, driven by the device location.
5. **Details / witnesses** — free text area.

Emergency incident types (Fire, Police, Medical, Hazard) are visibly locked with a "Verify to unlock" note for anyone below Level 3, and the backend refuses them too.

The form is reachable from the Emergencies card on Home and from Discover's report action. Existing broadcast, post and stream flows are untouched.

## 4. Legal gate

- Required checkbox: "I understand that intentional false reports or pranks result in immediate account suspension and a permanent platform ban."
- The glowing red **SUBMIT REPORT** button stays disabled until it is ticked (plus incident type and details present).
- Always-visible red warning block: "WARNING: THIS REPORT IS COMMUNITY-DRIVEN. DO NOT PUT YOURSELF IN DANGER. FOR LIFE-THREATENING EMERGENCIES, CALL 911."
- Acceptance is stored with the report for accountability.

## Technical notes

- Migration: `reputation_events` (actor, action, subject key, points, unique per action+subject), `trust_grants` (admin-set first-responder / ambassador flags, starting reputation), `public.trust_level(uuid)` SECURITY DEFINER returning 1–3, `public.reputation_total(uuid)`, `public.award_reputation(_action, _subject)` (validates action type, enforces uniqueness + daily cap, returns new total), `public.seed_ambassador(...)` admin-only. GRANTs: `authenticated` execute on `award_reputation`/`trust_level`/`reputation_total`; `service_role` on the rest. RLS: read own reputation rows, no client writes.
- Community reports reuse `community_posts` with a `report` payload (incident type stored as a tag, radius + witnesses in the body/fields already present) so the map, feed and moderation keep working; a `BEFORE INSERT` trigger rejects emergency incident tags when `trust_level(auth.uid()) < 3`.
- New `src/lib/trust-tiers.ts` (level labels, unlock copy, incident catalogue), `src/lib/reputation.ts` (award helpers), `src/components/CreateCommunityReportModal.tsx`, `src/components/TrustLevelBadge.tsx`. Wired into `src/routes/index.tsx` (Emergencies panel action) and `src/routes/community.tsx` (report action) only.
- Media goes through the existing `uploadCommunityPhoto` / `uploadMedia` path; geolocation through the existing helpers.
- Verify with typecheck plus a preview pass at phone and desktop widths: submit disabled until the checkbox is ticked, emergency types locked below Level 3.
