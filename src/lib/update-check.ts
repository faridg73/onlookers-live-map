// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Makes every newly published version reach people automatically.
 * Safari (and the app's web view) can keep an old page alive in memory when it
 * is reopened from the background. When the page comes back into view we ask
 * the server for a fresh copy and compare its script fingerprint with the one
 * that is running; if they differ, we reload once onto the new version.
 */
const SCRIPT_RE = /<script[^>]+type="module"[^>]+src="([^"]+)"/g;

function scriptsIn(html: string): string {
  return Array.from(html.matchAll(SCRIPT_RE), (m) => m[1]).sort().join("|");
}

function runningScripts(): string {
  return Array.from(document.querySelectorAll<HTMLScriptElement>('script[type="module"][src]'))
    .map((s) => new URL(s.src, location.href).pathname)
    .sort()
    .join("|");
}

let checking = false;
let lastCheck = 0;

async function checkForUpdate() {
  if (checking || Date.now() - lastCheck < 60_000) return;
  checking = true;
  lastCheck = Date.now();
  try {
    const res = await fetch(`/?v=${Date.now()}`, { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return;
    const fresh = scriptsIn(await res.text())
      .split("|")
      .map((src) => (src ? new URL(src, location.href).pathname : ""))
      .sort()
      .join("|");
    const current = runningScripts();
    if (fresh && current && fresh !== current) location.reload();
  } catch {
    /* offline — try again next time */
  } finally {
    checking = false;
  }
}

export function startUpdateCheck() {
  if (typeof window === "undefined" || import.meta.env.DEV) return;
  // Old service workers or caches from earlier builds must never pin a stale copy.
  void navigator.serviceWorker?.getRegistrations?.().then((regs) =>
    regs.forEach((r) => {
      if (!r.active?.scriptURL.includes("firebase-messaging-sw")) void r.unregister();
    }),
  );
  window.addEventListener("pageshow", (e) => {
    if ((e as PageTransitionEvent).persisted) location.reload();
  });
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") void checkForUpdate();
  });
}
