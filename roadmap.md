Discover and Flash category picker update
- [x] Inspect Discover filtering and Flash request flow
- [x] Reuse the shared 16-category picker on both screens
- [x] Connect selected category and vibe to filtering/tagging
- [x] Verify routes and responsive behavior

Responsive Home map controls
- [x] Add the floating top search pill
- [x] Add the collapsible drag-handle drawer
- [x] Connect recent search history and map recentering
- [x] Keep Post a Bounty visible as the primary drawer action
- [x] Verify mobile and desktop interactions

Home map category filtering
- [x] Add state for six category tiles
- [x] Filter map markers by the active category lane
- [x] Show a contextual result feed inside the drawer
- [x] Verify tile filtering and result selection

Emergency map mode
- [x] Filter to emergency-tagged crisis requests
- [x] Render pulsing red crisis markers
- [x] Add live crisis stream and scanner controls
- [x] Connect the Drop Live Alert action
- [x] Verify emergency mode across phone and desktop

Traffic map mode
- [x] Add live highway traffic overlay
- [x] Highlight incident heat zones in yellow and orange
- [x] Show vehicle incidents and closures with timestamps
- [x] Verify traffic mode across phone and desktop

Public Gathering map mode
- [x] Add crowd-density heat circles and venue pins
- [x] Open selected clusters with estimated headcounts
- [x] List live onlooker streams within the cluster
- [x] Verify gathering mode across phone and desktop

Trending Near You map mode
- [x] Filter broadcasts and bounties to a two-mile radius
- [x] Load nearby media posts into the map drawer
- [x] Rank fast-rising local activity with timestamps
- [x] Verify the local feed across phone and desktop
- [x] Neon badge artwork on the Home Explore Nearby card

Viral & Breaking map mode
- [x] Add a network-wide Viral & Breaking category
- [x] Rank content by engagement velocity
- [x] Show high-velocity metrics and Breaking badges
- [x] Verify the feed across phone and desktop

Top Creators map mode
- [x] Add a network-wide creator leaderboard tile
- [x] Rank creators by followers and reach
- [x] Show verification badges and live status
- [x] Verify the grid across phone and desktop

App-wide typography readability
- [x] Increase the shared type scale by one step
- [x] Verify key phone and desktop screens for fit and overflow

Explore drawer: full 16-category grid
- [x] Add Crime Reports, Scanner, Live Stream, Bounty Map, Community, Guides tiles with emojis and vibrant themes
- [x] Wire each tile's drawer behavior (crime feed, scanner feed, live streams, bounty map, community link, guides overlay)
- [x] Type-check and verify the 16-card grid on phone
- [x] Home: Bounty Map tile now opens an "Every open bounty, ranked by reward" feed (Sep 18)

Strange Sightings & UFO browse category
- [x] Add the uploaded neon UFO artwork and a 17th browse-only category
- [x] Add its report, community-log, and mystery-bounty actions
- [x] Filter its live/recorded feed and map results without changing broadcast creation
- [x] Verify mobile, desktop, and type safety

Breaking News custom category artwork
- [x] Replace the Breaking News emoji with the uploaded neon badge
- [x] Preserve its existing filtering, modal, and routing behavior
- [x] Verify sizing and interaction on mobile and desktop

Home Explore Nearby neon category artwork
- [x] Add the uploaded Traffic badge to the large Home card
- [x] Keep Strange Sightings artwork prominent on its Home card
- [x] Remove custom badge artwork from compact category dropdowns
- [x] Verify Home card sizing and unchanged tap behaviors

Home Emergencies neon category artwork
- [x] Add the uploaded Emergencies badge to the large Home card
- [x] Preserve the existing crisis view and tap behavior
- [x] Verify prominent sizing on mobile and desktop

Home Events & Arts neon category artwork
- [x] Add the uploaded Events & Arts badge to the large Home card — badge received as HEJFHERWIF.jpeg
- [x] Preserve the existing events/art filtering and tap behavior
- [x] Verify prominent sizing on mobile and desktop

## Home Community neon category artwork
- [x] Add the uploaded "Community Unity" neon badge to the large Home "Community" card (BLOCKED previously; badge received iytdfytfiytf.jpeg / user ref watermarked_img_12722684178706055576.jpg), preserve the community routing/tap behavior, verify prominent sizing on mobile and desktop.
- [x] Home Outdoor Recreation neon category artwork — add the uploaded "Outdoor Recreation" badge (jrgojergherg.jpeg) to the large Home card, keep tap behavior, verify mobile + desktop.
- [x] Home Nightlife neon category artwork — add the uploaded "NIGHTLIFE" badge (gigjgvjhvgjh.jpeg) to the large Home card, keep tap behavior, verify mobile + desktop.
- [x] Home Top Creators neon category artwork — added the uploaded "TOP CREATORS" badge to the large Home card, kept tap behavior, verified mobile + desktop.

## Home Scanner neon category artwork
- [x] Add the uploaded "SCANNER" neon badge (hfjfhksdrjfghbkjrgber.jpeg) to the large Home card, preserve the scanner tap behavior, verify prominent sizing on mobile and desktop.

## Home Bounty Map neon category artwork
- [x] Add the uploaded "BOUNTY MAP" neon badge (tyhrthrdtht.jpeg) to the large Home card, preserve the bounty-map tap behavior, verify prominent sizing on mobile and desktop.

## Home Guides neon category artwork
- [x] Add the uploaded "GUILDS" neon badge (hgjehrgjerrhger.jpeg) to the large Home "Guides" card — message said Bounty Map, but Bounty Map was already badge'd; the artwork matches Guides, preserve tap behavior, verify mobile + desktop.

## Trust tiers, reputation & community reports
- [x] Three trust levels (Reader/Flagger, Provisional Contributor, Verified Creator/First Responder) with backend helper and profile badge
- [x] Emergency incident reports restricted to level 3 (UI lock + database trigger)
- [x] Reputation points for flagging outdated posts, validating markers and the safety tutorial, with daily caps and admin ambassador seeding
- [x] Create Community Report form (incident grid, verified-only toggle, media, geo-radius, witnesses)
- [x] Legal pledge checkbox gating the glowing Submit Report button, with the 911 safety warning

## Refine Create Community Report modal
- [x] Rebalance the modal and replace the incident dropdown with a five-icon grid
- [x] Make creator authentication an automatic trust-level status aligned with the trust-workflow reference
- [x] Add locale-aware radius labels and immediate media thumbnails
- [x] Keep the submit control visible with pledge-gated neon activation
- [x] Verify phone and desktop behavior without changing report security
- [x] Make every submit requirement visible and verify the final report payload

## Complete report verification loop
- [x] Add visible simulated media-analysis processing and durable result state
- [x] Add Validate and Flag controls to active incident-report cards
- [x] Enforce Level 2/3 validation and one vote per member in the backend
- [x] Calculate report trust scores and Confirmed, Disputed, Unverified, or Expired statuses
- [x] Show dynamic report statuses on neighborhood map markers

## Preserve navigation state
- [x] Restore Community and Explore feed scroll positions within the browser session
- [x] Persist Community filters, tabs, map/feed view, and focused report
- [x] Persist Explore and Browse Places tabs plus selected map item
- [x] Restore Community, Explore, and Browse Places map center and zoom
- [x] Verify restoration through back navigation on phone and desktop

## Follower system completion
- [x] Explicit error logging when follow state fails to load
- [x] Follow buttons on creator rankings, Top Creators cards, and the profile "Creators you follow" list
- [x] Everyone/Following feed toggle that prioritises followed creators
- [x] Sample creator post seeded so follow behaviour can be tested
- [x] Public creator lookups (name, avatar, verified, follower count) via safe read-only helpers
- [x] All follow surfaces refresh together after a follow or unfollow
- [x] Fixed community cards crashing on an old category value
- [x] Fixed the daily check-in streak error

## Mobile real estate posting safeguards
- [x] Keep FAQ headers below the phone safe area
- [x] Restore accessible expand/collapse controls for every guideline question
- [x] Show and require explicit real estate authorization in bounty forms
- [x] Enforce the authorization attestation during server-side posting

## Mobile safe-area and close controls
- [x] Keep shared dialogs, sheets, and custom full-screen panels below the phone status area
- [x] Standardize modal and view close controls as visible 44px circular tap targets
- [x] Verify Help & FAQ spacing and close navigation on a phone viewport

## Profile progression and safety tutorial
- [x] Keep the Profile header below the phone status area
- [x] Award 10 XP per completed bounty with 500 XP required per level
- [x] Show live reputation points with high-contrast Level 3 details
- [x] Award safety points only after completing the interactive tutorial

## Profile management
- [x] Let members upload a profile photo and edit their name, location, and bio
- [x] Require typed confirmation before securely deleting an account and its linked data

## Mobile sub-page headers
- [x] Keep sub-page titles and controls below the iPhone status area
- [x] Standardize back controls with a visible 44px minimum touch target and history-aware navigation

## Persistent navigation state
- [x] Keep the Home Explore Nearby panel open by default and remember explicit collapse/expand choices
- [x] Preserve Home filters, selected category, map viewport, and panel scroll position
- [x] Restore route scroll positions across back navigation, including delayed feed content

## Dispute center filing
- [x] Keep the Dispute Center header below the phone status area
- [x] Let posters choose an eligible submitted bounty and a dispute reason
- [x] Accept a validated description and optional private evidence file
- [x] Hold escrow funds atomically for moderator review after a valid submission
- [x] Restrict filing to the bounty poster during the active review window

## Legal entity naming
- [x] Update user-facing company and platform references to Onlooker LLC
- [x] Update legal pages, FAQs, safety copy, footers, metadata, and release materials
- [x] Preserve Onlooker Live, Onlooker+, hashtags, URLs, identifiers, and creator-name fallbacks

## Paid bounty Step 1 education
- [x] Move category and subcategory selection to the top of Step 1
- [x] Place address search and map immediately after category selection
- [x] Add a dismissible first-time bounty guide with a persistent opt-out
- [x] Add the Real Estate escrow and PIN security guide on selection
- [x] Verify both dialogs and the reordered layout on phone and desktop
