import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";

import { MAX_CLIP_SECONDS } from "@/lib/video-compress";
import { PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";
import { isMobileCaptureDevice, requestNativeCapture } from "@/lib/native-capture";
import { DesktopWebcamRecorder } from "@/components/DesktopWebcamRecorder";

/**
 * Launches the phone's own camera app for clips and photos. There is no in-app
 * camera preview any more: the system camera keeps full native quality and
 * stabilisation, and nothing can be picked from the photo gallery.
 */
export function VideoRecorder({
  onClose,
  onRecorded,
  onPhoto,
}: {
  onClose: () => void;
  onRecorded: (file: File) => void;
  /** When provided, a second button opens the native camera in photo mode. */
  onPhoto?: (file: File) => void;
}) {
  const [busy, setBusy] = useState(false);
  const autoOpened = useRef(false);
  const [isMobile, setIsMobile] = useState(true);

  // Checked after hydration so the server and browser render the same markup.
  useEffect(() => {
    setIsMobile(isMobileCaptureDevice());
  }, []);

  const capture = useCallback(
    async (mode: "video" | "photo") => {
      if (busy) return;
      setBusy(true);
      try {
        const file = await requestNativeCapture(mode);
        if (!file) return;
        if (mode === "photo") {
          if (onPhoto) onPhoto(file);
          else onRecorded(file);
        } else {
          onRecorded(file);
        }
        onClose();
      } catch {
        toast.error("Your camera could not be opened. Check camera permissions and try again.");
      } finally {
        setBusy(false);
      }
    },
    [busy, onClose, onPhoto, onRecorded],
  );

  // The camera is never opened automatically: iOS blocks camera clicks that are
  // not tied to a real tap, which used to leave this screen spinning forever.
  // The person taps "Open camera to film" instead.

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
          Camera · max {MAX_CLIP_SECONDS}s
        </p>
        <button
          type="button"
          aria-label="Close camera"
          onClick={onClose}
          className="rounded-full bg-white/10 p-2 text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-4 overflow-y-auto px-6 text-center">
        {isMobile ? (
          <>
            {busy ? (
              <Loader2 className="size-8 animate-spin text-white/80" />
            ) : (
              <Video className="size-10 text-white/70" />
            )}
            <p className="text-sm font-semibold text-white">
              Your phone's camera opens for this capture, so the clip keeps its full quality.
            </p>
            <p className="text-xs text-white/60">Film it, then tap use or done to send it here.</p>
          </>
        ) : (
          <div className="w-full max-w-md text-left">
            <p className="mb-3 text-sm font-semibold text-white">
              Record with your computer's webcam, or pick a clip you already have.
            </p>
            <DesktopWebcamRecorder
              disabled={busy}
              onRecorded={(file) => {
                onRecorded(file);
                onClose();
              }}
            />
          </div>
        )}
      </div>

      <p className="px-4 pb-1 text-center text-[0.7rem] font-medium leading-snug text-amber-300">
        {PUBLIC_SPACES_DISCLAIMER}
      </p>

      <div className="flex flex-col gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          disabled={busy}
          onClick={() => void capture("video")}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
        >
          <Video className="size-5" /> {isMobile ? "Open camera to film" : "Choose a video file"}
        </button>
        {onPhoto && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void capture("photo")}
            className="flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/40 font-display text-sm font-extrabold uppercase tracking-[0.12em] text-white disabled:opacity-50"
          >
            <Camera className="size-5" /> Take a photo instead
          </button>
        )}
      </div>
    </div>
  );
}
