// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Native camera capture.
 *
 * Onlooker no longer runs its own in-app camera preview. Every capture is
 * handed to the phone's real camera app through a file input with
 * `capture="environment"`, so clips keep full native quality, stabilisation and
 * the familiar system camera UI on both iOS and Android.
 */

export type NativeCaptureMode = "video" | "photo";

/**
 * True on phones and tablets, where the `capture` attribute launches the real
 * camera app. Desktops and MacBooks ignore (or mishandle) `capture`, so they get
 * a normal picker/webcam file dialog instead.
 */
export function isMobileCaptureDevice(): boolean {
  if (typeof navigator === "undefined" || typeof window === "undefined") return false;
  const ua = navigator.userAgent || "";
  const phoneUA = /Android|iPhone|iPod|iPad|Windows Phone|Mobile Safari|Opera Mini/i.test(ua);
  // iPadOS reports a desktop UA but exposes touch points.
  const touchMac =
    /Macintosh/.test(ua) && typeof navigator.maxTouchPoints === "number" && navigator.maxTouchPoints > 1;
  const coarse = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  return phoneUA || touchMac || (coarse && window.innerWidth <= 1024);
}

/**
 * Opens the device camera app and resolves with the captured file, or null when
 * the person backs out without filming.
 */
export function requestNativeCapture(mode: NativeCaptureMode = "video"): Promise<File | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.multiple = false;
    input.accept = mode === "video" ? "video/*" : "image/*";
    // Phones and tablets launch the camera app; desktops fall back to the normal
    // file dialog (which can still record from a connected webcam).
    if (isMobileCaptureDevice()) input.setAttribute("capture", "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.opacity = "0";

    let settled = false;
    let checking = false;
    let leftPage = false;
    let safety: ReturnType<typeof setTimeout> | undefined;

    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      if (safety) clearTimeout(safety);
      window.removeEventListener("focus", onReturn);
      window.removeEventListener("pageshow", onReturn);
      document.removeEventListener("visibilitychange", onVisibility);
      input.remove();
      resolve(file);
    };

    // iOS/Android camera apps do not reliably fire "cancel", and some deliver the
    // file a moment after the page becomes visible again. So once we are back on
    // the page we poll briefly before deciding the person came back empty-handed.
    const pollForFile = () => {
      if (settled || checking) return;
      checking = true;
      let tries = 0;
      const tick = () => {
        if (settled) return;
        if (input.files && input.files.length > 0) return; // "change" settles it
        tries += 1;
        if (tries >= 10) finish(null);
        else setTimeout(tick, 400);
      };
      setTimeout(tick, 500);
    };

    function onReturn() {
      if (document.visibilityState === "hidden") return;
      pollForFile();
    }

    function onVisibility() {
      if (document.visibilityState === "hidden") {
        leftPage = true;
        return;
      }
      if (leftPage) pollForFile();
    }

    input.addEventListener("change", () => {
      const file = input.files?.[0] ?? null;
      finish(file && file.size > 0 ? file : null);
    });
    input.addEventListener("cancel", () => finish(null));

    document.body.appendChild(input);
    window.addEventListener("focus", onReturn);
    window.addEventListener("pageshow", onReturn);
    document.addEventListener("visibilitychange", onVisibility);

    // Last-resort guard: if the camera never opened (a blocked programmatic
    // click, for example) we must never leave the caller spinning forever.
    safety = setTimeout(() => {
      if (!input.files || input.files.length === 0) finish(null);
    }, 20000);

    input.click();
  });
}

/** Reads how long a captured clip runs, used for payouts and stream stats. */
export function captureDurationSeconds(file: File): Promise<number> {
  if (typeof document === "undefined") return Promise.resolve(0);
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const probe = document.createElement("video");
    probe.preload = "metadata";
    const done = (value: number) => {
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(value) && value > 0 ? Math.round(value) : 0);
    };
    probe.onloadedmetadata = () => done(probe.duration);
    probe.onerror = () => done(0);
    probe.src = url;
  });
}
