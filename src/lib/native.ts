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
  "https://onlooker.io",
  "https://www.onlooker.io",
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

function revealFocusedField() {
  const active = document.activeElement;
  if (!(active instanceof HTMLElement)) return;
  window.setTimeout(() => active.scrollIntoView({ block: "center", behavior: "smooth" }), 120);
}

function installIosEdgeSwipe(goBack: () => void) {
  if (Capacitor.getPlatform() !== "ios") return;
  let startX = 0;
  let startY = 0;
  let tracking = false;

  document.addEventListener("touchstart", (event) => {
    const touch = event.touches[0];
    const target = event.target;
    if (!touch || !(target instanceof Element) || target.closest("input, textarea, select, [contenteditable='true'], [data-swipe-lock]")) {
      tracking = false;
      return;
    }
    tracking = touch.clientX <= 24;
    startX = touch.clientX;
    startY = touch.clientY;
  }, { passive: true });

  document.addEventListener("touchend", (event) => {
    if (!tracking) return;
    tracking = false;
    const touch = event.changedTouches[0];
    if (!touch) return;
    const deltaX = touch.clientX - startX;
    const deltaY = Math.abs(touch.clientY - startY);
    if (deltaX >= 88 && deltaX > deltaY * 1.35) goBack();
  }, { passive: true });
}

// Call once from the root component (inside an effect). Registers:
//  - appUrlOpen: emailed bounty/approval links open inside the installed app
//  - backButton (Android): router back, exit only when there is nowhere to go
export async function initNativeShell(navigate: NavigateFn, canGoBack: () => boolean, goBack: () => void) {
  if (initialized || !isNativeApp()) return;
  initialized = true;

  document.documentElement.classList.add("native-shell");

  const [{ App }, { Keyboard, KeyboardResize, KeyboardStyle }, { StatusBar, Style }] = await Promise.all([
    import("@capacitor/app"),
    import("@capacitor/keyboard"),
    import("@capacitor/status-bar"),
  ]);

  await StatusBar.setOverlaysWebView({ overlay: false });
  await StatusBar.setStyle({ style: Style.Light });
  await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  await Keyboard.setStyle({ style: KeyboardStyle.Dark });
  await Keyboard.setScroll({ isDisabled: false });

  await Keyboard.addListener("keyboardWillShow", ({ keyboardHeight }) => {
    document.documentElement.style.setProperty("--keyboard-height", `${keyboardHeight}px`);
    document.documentElement.classList.add("keyboard-open");
    revealFocusedField();
  });

  await Keyboard.addListener("keyboardDidShow", revealFocusedField);

  await Keyboard.addListener("keyboardWillHide", () => {
    document.documentElement.style.setProperty("--keyboard-height", "0px");
    document.documentElement.classList.remove("keyboard-open");
  });

  installIosEdgeSwipe(goBack);

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
