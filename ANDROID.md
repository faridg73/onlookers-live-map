# Onlooker — Google Play release guide

Everything for the Android app is already in this project: the Android app folder,
the signing key (`android/app/onlooker-upload.keystore`), the app icons and splash screens,
and an automated build.

> **New signing key generated:** because the previous keystore password was stored in
> git history, a fresh upload key was created. Use the new keystore and its password
> for all future builds. The old `release.keystore` is no longer used.

App details Play already expects:

- Package name: `app.lovable.onlooker`
- App name: Onlooker
- Version: 1.0 (version code 2)
- New upload key SHA-256: `90:E7:A7:63:D5:FF:2C:6F:07:2A:05:65:53:03:49:49:FB:FE:6D:9F:07:DC:DB:AD:FC:AF:CD:AE:AA:C5:25:1D`

## Get the file Play is asking for (.aab)

You need `app-release.aab`. Two ways:

### Option A — let GitHub build it (no Android Studio needed)

1. Push this project to GitHub (Lovable → GitHub → sync).
2. In the GitHub repo, go to **Settings → Secrets and variables → Actions** and add:
   - `ANDROID_KEYSTORE_PASSWORD` — your keystore password
   - `ANDROID_KEY_ALIAS` — `onlooker-key`
   - `ANDROID_KEY_PASSWORD` — your key password
3. Open **Actions → Build Android App Bundle for Google Play → Run workflow**
   (it also runs automatically on every push to `main`).
3. When it finishes, open the run and download the **onlooker-release-aab** artifact.
4. Unzip it — inside is `app-release.aab`.
5. Drag that file into the "Drop app bundles here to upload" box in Play Console,
   add release notes, then **Next → Save → Review → Start rollout to internal testing**.

### Option B — build on your Mac

First copy `android/keystore.properties.example` to `android/keystore.properties`
and fill in your keystore and key passwords. That file is git-ignored, so the
passwords stay on your machine only.

```bash
npm install
npm run build
npx cap sync android
cd android && ./gradlew bundleRelease
```

The file lands at `android/app/build/outputs/bundle/release/app-release.aab`.

## Every new release

Bump `versionCode` (and `versionName` if you want) in `android/app/build.gradle`,
then rebuild. Play rejects a bundle that reuses a version code.

## Store listing content

Copy, screenshots and the feature graphic are ready in `store-kit/`:

- `store-kit/listing.md` — short + full description, keywords, categories, checklist
- `store-kit/feature-graphic.png` — 1024×500 banner
- `store-kit/screenshots/play-*.png` — phone screenshots (1080×1920)
- `public/app-icon.png` — app icon source

## Play forms you must complete before rollout

- **App access** — the app needs a sign-in, so give Play a test account (email + password)
  under *App content → App access*.
- **Data safety** — declare: account info (email, name), precise location, photos/videos,
  and payment info; all collected, encrypted in transit, deletable on request.
- **Privacy policy URL** — https://onlookers-live-map.lovable.app/privacy
- **Permissions** — the app requests camera, microphone and location; explain that they are
  used only while a user is capturing a requested view.
- **Content rating** questionnaire and **target audience** (18+ recommended, money changes hands).
