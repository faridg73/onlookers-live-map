/**
 * Native camera capture.
 *
 * Onlooker LLC no longer runs its own in-app camera preview. Every capture is
 * handed to the phone's real camera app through a file input with
 * `capture="environment"`, so clips keep full native quality, stabilisation and
 * the familiar system camera UI on both iOS and Android.
 */

export type NativeCaptureMode = "video" | "photo";

/**
 * Opens the device camera app and resolves with the captured file, or null when
 * the person backs out without filming.
 */
export function requestNativeCapture(mode: NativeCaptureMode = "video"): Promise<File | null> {
  if (typeof document === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = mode === "video" ? "video/*" : "image/*";
    // Tells iOS and Android to launch the camera instead of the file browser.
    input.setAttribute("capture", "environment");
    input.style.position = "fixed";
    input.style.left = "-9999px";
    input.style.opacity = "0";

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onFocus);
      input.remove();
      resolve(file);
    };

    // Some system camera apps never fire "cancel"; a window focus with no file
    // selected means the person came back empty-handed.
    function onFocus() {
      setTimeout(() => {
        if (!input.files || input.files.length === 0) finish(null);
      }, 800);
    }

    input.addEventListener("change", () => {
      const file = input.files?.[0] ?? null;
      finish(file && file.size > 0 ? file : null);
    });
    input.addEventListener("cancel", () => finish(null));

    document.body.appendChild(input);
    window.addEventListener("focus", onFocus);
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
