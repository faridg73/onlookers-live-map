# Onlooker — Mobile & App Store Guide

Onlooker ships two mobile paths:

1. **Installable web app (PWA)** — works today, no store needed.
2. **Native shell (Capacitor)** — what you submit to the App Store and Google Play.

## 1. Install from the browser (no store)

Publish the project, then on your phone:

- **iOS (Safari):** Share → Add to Home Screen
- **Android (Chrome):** menu → Install app / Add to Home screen

The app launches full-screen with its own icon.

## 2. Build the native apps

### Requirements

- Node.js 20+
- **iOS:** a Mac with Xcode 15+, plus an Apple Developer account ($99/year)
- **Android:** Android Studio, plus a Google Play developer account ($25 one-time)

### Steps

```bash
# 1. Export the project to GitHub from Lovable, then clone it
git clone <your-repo-url>
cd <your-repo>

# 2. Install dependencies
npm install

# 3. Add the native platforms
npx cap add ios
npx cap add android

# 4. Build the web bundle
npm run build

# 5. Copy the build into the native projects
npx cap sync

# 6. Run
npx cap run ios       # or: npx cap open ios
npx cap run android   # or: npx cap open android
```

Re-run `npm run build && npx cap sync` after every web change.

### Live reload during development

`capacitor.config.ts` points at the Lovable preview URL, so the native app loads
the latest preview automatically. **Delete the `server` block before building a
release**, then re-run `npx cap sync` so the app ships the bundled web assets.

## 3. Submitting to the stores

### Apple App Store

1. In Xcode set the bundle identifier (`app.lovable.onlooker`), team, and version.
2. Add app icons and a launch screen (icons live in `public/`).
3. Product → Archive → Distribute App → App Store Connect.
4. In App Store Connect fill in the listing, screenshots, privacy details
   (Onlooker uses camera and location if you enable those plugins), then submit.

### Google Play

1. In Android Studio set `applicationId`, `versionCode`, and `versionName`.
2. Build → Generate Signed Bundle (AAB) with a keystore you keep safe.
3. Upload the AAB in the Play Console, complete the data-safety form, and roll out.

## 4. Useful native plugins

```bash
npm i @capacitor/camera @capacitor/geolocation @capacitor/push-notifications
npx cap sync
```

These map directly onto Onlooker's core flows: taking a live shot, pinning your
position on the map, and getting notified when a bounty lands near you.

## 5. Store submission kit (already prepared)

A complete kit was generated for you in the project's Files panel
(`store-kit/` folder):

- `feature-graphic.png` — Google Play banner, exact 1024x500 spec
- `screenshots/` — real app screenshots at required sizes:
  - Play phone (1080x1920): map, feed, post, profile
  - App Store 6.7" (1290x2796): map, feed, post, profile
  - App Store 6.5" (1242x2688): map, feed, post, profile
- `listing.md` — copy-paste description, keywords, categories, and the
  full upload checklist for both stores

The app icon lives at `public/app-icon.png` (1024x1024).
