// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Video, X } from "lucide-react";
import { toast } from "sonner";

import { MAX_CLIP_SECONDS } from "@/lib/video-compress";
import { PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";
import { isMobileCaptureDevice, requestNativeCapture } from "@/lib/native-capture";
import { DesktopWebcamRecorder } from "@/components/DesktopWebcamRecorder";
import { SubmissionSupportLink } from "@/components/SubmissionSupportLink";

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
  const [isMobile, setIsMobile] = useState(true);

  // Checked after hydration so the server and browser render the same markup.
  useEffect(() => {
    setIsMobile(isMobileCaptureDevice());
  }, []);

  const capture = useCallback(
    async (mode: "video" | "photo") => {
      
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
    <div className="fixed inset-0 z-[70] overflow-y-auto bg-black">
      <div className="flex min-h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white">
          Camera · max {MAX_CLIP_SECONDS}s
        </p>
        <button
          type="button"
          aria-label="Close camera"
          onClick={onClose}
          className="grid size-11 shrink-0 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-4 text-center">
        {isMobile ? (
          <>
            <Video className="size-10 shrink-0 text-white" />
            <p className="text-sm font-semibold text-white">
              Tap open camera and your phone's camera app takes over, so the clip keeps its full
              quality.
            </p>
            <p className="text-xs text-white">Film it, then tap use or done to send it here.</p>
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

      <div className="px-4 pt-2">
        <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-[0.7rem] font-medium leading-snug text-amber-300">
          {PUBLIC_SPACES_DISCLAIMER}
        </p>
      </div>

      <div className="flex justify-center px-4 pb-1 pt-2">
        <SubmissionSupportLink tone="light" />
      </div>


      <div className="flex flex-col gap-3 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"

          onClick={() => void capture("video")}
          className="flex h-14 items-center justify-center gap-2 rounded-2xl bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
        >
          <Video className="size-5" /> {isMobile ? "Open camera to film" : "Choose a video file"}
        </button>
        {onPhoto && (
          <button
            type="button"

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
