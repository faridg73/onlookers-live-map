// Native shell bridge for the Capacitor iOS/Android apps.
// Safe to import anywhere: every function no-ops in a plain browser.

import { Capacitor } from "@capacitor/core";

export const isNativeApp = (): boolean => {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
};

type NavigateFn = (path: string) => void;

// Converts an absolute onlooker URL (deep link / universal link) into an
// in-app path and navigates there. Ignores anything not on our origins.
const APP_ORIGINS = [
  "https://onlookerlive.com",
  "https://www.onlookerlive.com",
  "https://onlooker.lovable.app",
];

export function pathFromAppUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (!APP_ORIGINS.includes(parsed.origin)) return null;
    return parsed.pathname + parsed.search + parsed.hash;
  } catch {
    return null;
  }
}

let initialized = false;

// Call once from the root component (inside an effect). Registers:
//  - appUrlOpen: emailed bounty/approval links open inside the installed app
//  - backButton (Android): router back, exit only when there is nowhere to go
export async function initNativeShell(navigate: NavigateFn, canGoBack: () => boolean, goBack: () => void) {
  if (initialized || !isNativeApp()) return;
  initialized = true;

  const { App } = await import("@capacitor/app");

  await App.addListener("appUrlOpen", ({ url }) => {
    const path = pathFromAppUrl(url);
    if (path) navigate(path);
  });

  await App.addListener("backButton", ({ canGoBack: webviewCanGoBack }) => {
    if (canGoBack() || webviewCanGoBack) {
      goBack();
    } else {
      void App.exitApp();
    }
  });
}
