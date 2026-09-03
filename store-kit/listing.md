# Onlooker — Store Submission Kit

Everything you need to publish **Onlooker** on Google Play and the App Store.
Copy the text into the store consoles. Files in this folder:

| File | Purpose |
| --- | --- |
| `listing.md` | This file — copy-paste copy for both stores |
| `feature-graphic.png` | Google Play feature graphic (1024×500) |
| `screenshots/play-*.png` | Google Play phone screenshots (1080×1920) |
| `screenshots/ios67-*.png` | App Store 6.7" screenshots (1290×2796) |
| `screenshots/ios65-*.png` | App Store 6.5" screenshots (1242×2688) |

---

## App name

- **Display name:** Onlooker
- **Short name (Android):** Onlooker

## Short description (Google Play — 80 chars max)

> Live photo requests, bounties and real-time views from your city.

## Full description (Google Play)

> Onlooker is a live-view community for your city. Need to know if the night market is still open, how long the ferry line is, or what the sunset looks like from the east ridge right now? Post a live photo request, set a bounty, and nearby onlookers send you real-time shots.
>
> **How it works**
> - POST A REQUEST — ask for any live view, anywhere in the city.
> - SET A BOUNTY — reward onlookers who deliver. From $5 to $40.
> - GET LIVE SHOTS — onlookers claim your request and send photos in real time.
> - EARN AS AN ONLOOKER — browse open requests on the live map, claim one nearby, send the shot, and get paid.
>
> **Features**
> - Interactive live map of every open request in your city
> - Real-time request feed with bounties, watchers and countdowns
> - One-tap request creation with photo details
> - Onlooker profile with earnings, balance and activity
> - Fast, lightweight and works on any phone
>
> Privacy: Onlooker lets you share your live location only while you are actively delivering a request. You control what you share, and you can turn it off at any time.

## App Store description (up to 4000 chars — use the Google Play text above, plus:)

> Onlooker turns your city into a live camera network. Someone, somewhere, is always looking. Post a request, set a bounty, and get the shot in minutes.

## Keywords (App Store, 100 chars max)

> live, photo, camera, map, bounty, city, realtime, crowdsource, view, neighborhood, street, onlooker

## Categories

- **Google Play:** Photography (primary) · Social (secondary)
- **App Store:** Photo & Video (primary) · Social Networking (secondary)

## Content rating

- **Google Play:** answer the questionnaire — no sexual content, mild language only; 3+ rating expected.
- **App Store:** 4+ (no objectionable content; unmoderated user photos → consider answering "users generate content" and enabling reporting).

## Contact details

- **Developer name:** (your full name or company)
- **Email:** (your email — required by both stores)
- **Website:** https://onlookers-live-map.lovable.app
- **Privacy policy URL:** https://onlookers-live-map.lovable.app/privacy (create a simple page on your site, or use a free policy generator and host it)

## App icon & graphics

- **Icon:** `public/app-icon.png` (already in the project; Android wants 512×512, iOS will take the 1024 source)
- **Google Play feature graphic:** `feature-graphic.png` (1024×500)
- **Screenshots:** use the matching size set per store (see table above)

## Upload checklist

### Google Play
1. Play Console → Create app → name **Onlooker**, category Photography.
2. Store listing: paste short + full description, upload feature graphic, icon, 2+ screenshots (`play-*`), set category/content rating/contact.
3. App bundle: in Android Studio, Build → Generate Signed App Bundle → upload the `.aab` to Production → review → rollout.

### App Store
1. App Store Connect → My Apps → + → New App → name **Onlooker**.
2. App Information: category Photo & Video, privacy policy URL, content rating.
3. Screenshots: upload `ios67-*` and `ios65-*` for the right device sizes.
4. Build: Xcode → Product → Archive → Distribute → App Store Connect. Then select the build under TestFlight/App Store and submit for review.

## Fees
- Apple Developer Program: **$99/year** (required)
- Google Play: **$25 one-time** (required)