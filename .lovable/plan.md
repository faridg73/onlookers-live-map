# Poster bounty dashboard

A single page where someone who posts bounties can see everything they've posted and what happened to it — no admin access needed.

## New page: "My bounties"

Reached from the Profile page and from the "Everything else" menu, at `/my-bounties`.

**Summary row at the top** (each tile hidden when zero, matching the rest of the app):
- Open — bounties still waiting for an onlooker
- In progress — claimed or footage submitted, waiting on you
- Credits held in escrow — money locked right now
- Paid out — total released to onlookers
- Refunded — credits that came back to you (expired or cancelled)

**Three lists, newest first:**

1. **Open** — title, spot with its location-type badge, reward, time left, and how many onlookers are watching. Actions: open the bounty, cancel it (refunds the escrow through the existing path), edit the location tag.
2. **Needs your review / in progress** — claimed bounties and ones with submitted footage. Shows the submitted clip thumbnail and links straight into the existing review dialog where you approve or dispute. Flags anything in dispute.
3. **Settled** — completed, expired, refunded and disputed bounties, each showing the outcome and the credits: paid to the onlooker, refunded to you, or under review.

Empty states use the app's encouraging tone, e.g. "Nothing open right now — post a bounty and watch it land here."

## Technical notes

- New server function `listMyPostedBounties` in `src/lib/requests.functions.ts` (`requireSupabaseAuth`, poster-scoped): reads the caller's `requests` rows in every status, left-joined to `escrows` (status, amount, `auto_release_at`, `disputed_at`), `claims` (status, spotter, claimed_at) and `bounty_videos` (id, storage/thumb path, accepted_at, payout_amount) for those request ids. Returns one flat row per bounty with a derived `stage`: `open` | `claimed` | `submitted` | `disputed` | `completed` | `refunded` | `expired`.
- New `src/routes/my-bounties.tsx` route with its own `head()` (title/description/og). Data via `useQuery` in the component (not a loader — the function is auth-gated). Reuses `RequestCard`-style presentation but a compact dashboard row component local to the route; reuses `BountyVideoDialog` for review and `locationTypeById` for the badge.
- Reuses existing money paths: `cancelBountyRequest`, `acceptBountyVideo`, `disputeBountyVideo`. No new SQL, no schema change, no new RLS — existing poster-scoped policies already permit these reads.
- Links added in `src/components/AppMenu.tsx` and on the Profile page above "Your requests".
- Styling follows the standing rules: neutral `#2A2A2A`-style borders, cards a step lighter than the page, neon lime only on active tabs and credit amounts, red only for a real open dispute.
