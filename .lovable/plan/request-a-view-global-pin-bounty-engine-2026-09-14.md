# Request a View — global pin & bounty engine

Three connected pieces: drop a funded pin anywhere in the world, alert the people standing near
that pin, and turn an accepted alert into a live stream tied to the locked reward.

## 1. Drop a pin anywhere on the world map

- On the map screen, a new **Request a View** mode: tap "Drop a pin", then tap (or long-press)
  anywhere on the map. The map starts zoomed out far enough to reach any country, and a search
  box lets people jump to a city or address first.
- The dropped pin is named automatically from its coordinates ("Trafalgar Square, London"), with
  a manual name field if the lookup comes back vague.
- A funding sheet opens on the pin: quick-pick reward tiers (Standard with a typed amount,
  Fast Catch, High Priority), live dollar equivalent, the 40-Credit minimum, live wallet balance,
  and a full cost breakdown before anything is locked.
- Same protections already used elsewhere: red inline field errors plus a toast for a missing
  name or amount, a toast naming the exact shortfall (pointing to buy credits) when the balance
  is too low, and a human check that must pass before credits move.
- Confirming locks the reward in escrow through the existing request flow, so the pin appears on
  the shared map for everyone and the money is held until someone delivers.

## 2. Targeted alerts to people near the pin

- Alerts now respect each person's own alert distance instead of one fixed 1.5-mile ring: anyone
  whose last known position sits inside *their* chosen radius of the new pin gets alerted, up to
  a 25-mile outer limit.
- Alert wording matches the request: **"Bounty Alert: [Location Name]"**, with the reward that is
  already locked, what to film, and how long they have.
- Verified broadcasters near the pin are prioritised first in the send order, and the alert opens
  straight onto the pin with the accept button ready.
- Delivery stays best-effort in three channels already wired up (in-app notification, device push,
  optional text) and a delivery problem never blocks the funded request from going live.

## 3. Accept → human check → live stream tied to the escrow

- The pin's bottom sheet gains a **Go live for this bounty** path for live-stream requests: a
  human check sits above the button, and passing it accepts the bounty.
- Accepting records the claim, which moves the reward from held to reserved for that broadcaster,
  and immediately opens a live session bound to that request id — so the stream, the claim and the
  locked reward are one chain.
- The requester sees the session go live on their pin; when they approve, the reserved reward pays
  out to the broadcaster exactly as it does today. If the broadcaster never goes live before the
  deadline, the reservation lapses and the money returns to the requester.
- Only one broadcaster can hold a pin at a time, and an unverified human check never reaches the
  accept step.

## Technical notes

- New `src/lib/request-a-view.ts` + `src/components/RequestViewPinDialog.tsx`; map gets a pin-drop
  mode (`onMapPin` callback in `MapCanvas`, min zoom lowered to world view, Places search box
  reusing `AreaPicker` geocoding). Funding reuses `quoteBounty`, `BountyPriceBreakdown`,
  `lockBounty` (`createBountyRequest` → escrow trigger), `useHumanCheck("request-a-view")`.
- `geo-alerts.server.ts`: query `onlookers_within_radius` at the 25-mile outer bound, join
  `alert_preferences.radius_miles` per user and keep those inside their own radius; title becomes
  `Bounty Alert: <location_name>`; order verified profiles first.
- Migration: add nullable `request_id uuid references public.requests(id) on delete set null` to
  `stream_sessions`, plus `start_bounty_stream(_request_id uuid)` (SECURITY DEFINER) that asserts
  the caller holds an in-progress claim on an open request and returns the session id. Frontend
  `acceptBountyAndGoLive` server fn: `assertHuman(token, "accept-bounty")` → insert `claims` row
  (existing `mark_request_claimed` + `escrow_reserve_on_claim` triggers fire) → `start_bounty_stream`.
- `BountyBottomSheet` renders the human check + live path for `bountyType === "live_stream"`,
  keeping today's clip upload path for pre-recorded requests.
