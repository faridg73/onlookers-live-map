# Native release hardening

## Goal
Ship the existing Onlooker experience through Capacitor as a polished iOS and Android app, not as a browser-looking wrapper, while preserving the current web product and flows.

## What will change

### Native shell
- Keep **Capacitor 8** as the store packaging approach. The iOS Xcode project produces the signed `.ipa`/TestFlight build; the Android Gradle project produces the signed `.aab` for Play Console.
- Configure the WebViews as standalone app surfaces: no browser address/navigation chrome, no browser-style reload gesture, dark system bars, and app-owned navigation.
- Add iOS edge-swipe back behavior and preserve Android’s hardware/gesture back handling.
- Add native keyboard resize behavior and focused-field scrolling so forms, chat, checkout, and dialogs stay visible above the keyboard.

### Insets and shared UI
- Establish shared top and bottom safe-area rules for every route and overlay, including the Dynamic Island/notch, iPhone home indicator, Android status bar, and gesture/navigation bar.
- Harden shared dialogs, sheets, drawers, notifications, and the fixed bottom navigation rather than patching only Home.
- Preserve native scrolling momentum while preventing browser-style overscroll/reload behavior at the app root.

### Responsive release matrix
Verify these exact viewport classes:
- iPhone SE: 375 × 667
- Standard iPhone: 390 × 844
- iPhone Pro Max: 430 × 932
- Android phone: 412 × 915
- Android tablet: 800 × 1280

For each size, inspect Home and Discover, including:
- Gold Real Estate & Property Pros card
- Explore by Vibe grid
- Bottom navigation
- Text wrapping, clipping, overlap, and minimum tap areas

Also exercise representative text-entry and overlay flows to check keyboard-safe layout.

### Assets and release files
- Audit the iOS AppIcon catalog and Android mdpi through xxxhdpi icon/splash resources.
- Keep the existing high-density native icon/splash sets where complete; replace or regenerate only missing/undersized entries.
- Audit displayed Home imagery for sufficient source resolution and stable aspect ratios.
- Confirm both store workflows use the current native projects and latest published onlooker.io experience.

## Verification and limits
- Run automated responsive screenshots and overflow checks for all five target sizes.
- Run available native build/config checks and inspect the generated native projects.
- This environment does **not** contain Xcode Simulator, Android Emulator, or connected physical devices. I will not label browser viewport tests as native-device proof. Final native proof must be completed from the signed TestFlight and Play Internal Testing builds on your devices, using a short device checklist I will provide.
- Do not submit either store build until those physical-device checks pass.

## Technical details
- Add only the Capacitor plugins needed for native keyboard and system-bar behavior.
- Centralize native initialization in the existing native bridge and shared root shell.
- Keep deep links on `https://onlooker.io` and retain old-domain compatibility.
- Do not alter payment, bounty, verification, broadcasting, or posting business logic.
