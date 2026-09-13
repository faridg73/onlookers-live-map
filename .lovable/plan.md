# Overhaul Post a Live Request

## Goal
Rebuild `/post` into a clearer, more energetic request flow using Onlooker’s black, charcoal, and lemon-green brand, while preserving escrow, moderation, category rules, access codes, deadlines, and submission behavior.

## What will change

### 1. Stronger request-page hierarchy
- Rename the page heading to **Post a Live Request** and tighten the supporting copy.
- Use lemon-green for step markers, active choices, focused fields, selected values, map controls, and important reward totals.
- Keep content grouped into compact sections without nested cards or oversized blocks.
- Use the existing shared button styles for primary and secondary actions.

### 2. Full interactive location map
- Reuse the main map’s Google Maps setup and visual behavior in a location-picking mode rather than maintaining a separate mini-map experience.
- Preserve typed address geocoding, map tap selection, draggable pin placement, reverse-geocoded address feedback, and exact coordinates.
- Add working zoom and current-location controls consistent with the main map.
- Keep Google business, venue, transit, and street labels visible; fetch and display nearby business/venue names dynamically once the user zooms in.
- Give the map a stable, touch-friendly responsive height so it works cleanly inside the form on Android, iPhone, and desktop.

### 3. Cleaner categories and subcategories
- Present the shared category set in a more scannable responsive grid.
- Keep Public Performances, Street Views, Local Pop-ups, and Community Rescues clearly visible as first-level choices or clearly named refinements using the existing category model.
- Reveal subcategory pills directly beneath the selected category, with a strong lemon-green selected state.
- Preserve identical selection/filter behavior between `/post` and `/feed` by continuing to use the shared category source.

### 4. Collapsible privacy and creator guidance
- Replace the prominent always-visible warning panels with a compact **Privacy & Guidelines** information drawer.
- Place creator-rights, public-space, permission, and access-code guidance inside that drawer where appropriate.
- Keep required permission confirmation and private access-code inputs visible when they are required, so legal safeguards are not weakened.
- Preserve the existing moderation block and return focus to the relevant field without clearing the form.

### 5. Looker Coin rewards with transparent USD values
- Change bounty presets to **20, 40, 80, and 160 Looker Coins**, representing **$5, $10, $20, and $40** at the fixed 4:1 rate.
- Display the coin reward and approximate USD value together on every preset and custom reward summary.
- Update the minimum bounty to **20 coins ($5)** and update tip/boost amounts to preserve their existing dollar values.
- Show the complete escrow total in both coins and USD before posting.

### 6. Apply the 4:1 exchange rate consistently
- Centralize the fixed conversion as **4 Looker Coins = $1 USD** and remove duplicate 10:1 calculations.
- Update wallet balances, earnings, cash-out previews, payout history, admin cash-out figures, FAQs, micro-tips, bounty tiers, and payment-credit calculations.
- Keep the existing **$10 minimum cash-out**, represented as **40 Looker Coins**.
- Update purchasable coin-pack grant amounts to match the new exchange rate while preserving their existing card prices; ensure purchase credits use the revised amounts.
- Add a backend migration updating live cash-out and reporting functions so stored payout calculations match the UI.

## Technical details
- Preserve the existing request submission sequence: validation → wallet check → escrow lock → request creation → feed navigation.
- Do not change authentication, chat, review/approval, dispute, media-capture, or payout-provider workflows.
- Avoid converting historical stored coin transactions; the new exchange rate applies to displayed cash value and future transactions.
- Add complete social metadata to the updated `/post` page.

## Validation
- Run focused tests for 20/40/80/160 coin conversions and minimums.
- Verify address search, map tap, pin drag, current location, zoom, and nearby venue labels.
- Verify category/subcategory selection, conditional permissions/access codes, privacy drawer, moderation focus return, wallet shortfall handling, and deadline behavior.
- Check `/post` at mobile and desktop sizes, then run the project typecheck.
