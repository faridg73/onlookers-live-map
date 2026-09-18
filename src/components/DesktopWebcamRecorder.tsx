import { useCallback, useEffect, useRef, useState } from "react";
import { CameraOff, FolderOpen, Loader2, RefreshCw, Square, Video } from "lucide-react";
import { toast } from "sonner";

import { MAX_CLIP_SECONDS } from "@/lib/video-compress";

/** Give up on the camera after this long and show the fallback instead of spinning forever. */
const CAMERA_TIMEOUT_MS = 3000;

/**
 * Desktop / laptop recorder. Phones use the system camera app, but computers
 * have no such app, so here we record straight from the built-in webcam and hand
 * back a normal video file.
 */
export function DesktopWebcamRecorder({
  onRecorded,
  disabled = false,
}: {
  onRecorded: (file: File) => void;
  disabled?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<BlobPart[]>([]);
  const [state, setState] = useState<"idle" | "starting" | "live" | "recording" | "failed">("idle");
  const [seconds, setSeconds] = useState(0);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const start = useCallback(async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setState("failed");
      return;
    }
    setState("starting");
    // If the camera hasn't answered within the timeout, stop waiting and show
    // the fallback instead of an endless spinner.
    const timeoutId = window.setTimeout(() => {
      setState((current) => {
        if (current !== "starting") return current;
        streamRef.current?.getTracks().forEach((track) => track.stop());
        streamRef.current = null;
        return "failed";
      });
    }, CAMERA_TIMEOUT_MS);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      window.clearTimeout(timeoutId);
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState("live");
    } catch {
      window.clearTimeout(timeoutId);
      setState("failed");
    }
  }, []);

  const pickFile = useCallback(() => {
    if (typeof document === "undefined") return;
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "video/*";
    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (file && file.size > 0) onRecorded(file);
    });
    input.click();
  }, [onRecorded]);

  const record = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream);
    } catch {
      toast.error("Recording isn't supported in this browser.");
      return;
    }
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "video/webm" });
      stopStream();
      setState("idle");
      setSeconds(0);
      if (blob.size > 0) {
        onRecorded(new File([blob], `onlooker-${Date.now()}.webm`, { type: blob.type }));
      }
    };
    recorderRef.current = recorder;
    recorder.start();
    setSeconds(0);
    setState("recording");
  }, [onRecorded, stopStream]);

  const stop = useCallback(() => {
    recorderRef.current?.state === "recording" && recorderRef.current.stop();
  }, []);

  // Countdown and hard stop at the clip limit.
  useEffect(() => {
    if (state !== "recording") return;
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state === "recording" && seconds >= MAX_CLIP_SECONDS) stop();
  }, [seconds, state, stop]);

  return (
    <div className="flex flex-col gap-3">
      <div className="relative overflow-hidden rounded-2xl border border-white/15 bg-black">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`aspect-video w-full object-cover ${state === "idle" || state === "failed" ? "opacity-0" : ""}`}
        />
        {state === "idle" && (
          <p className="absolute inset-0 grid place-items-center px-4 text-center text-xs text-white/60">
            Your computer's webcam will appear here once you start it.
          </p>
        )}
        {state === "failed" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center">
            <CameraOff className="size-8 text-white/50" />
            <p className="text-xs font-semibold text-white">Your camera couldn't be opened.</p>
            <p className="text-[0.7rem] leading-relaxed text-white/60">
              Check that your browser is allowed to use the camera (the padlock icon in the address
              bar), close other apps using the webcam, then retry — or choose a video file instead.
            </p>
          </div>
        )}
        {state === "recording" && (
          <span className="absolute left-3 top-3 rounded-full bg-red-500/90 px-2 py-0.5 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-white">
            rec {seconds}s / {MAX_CLIP_SECONDS}s
          </span>
        )}
      </div>

      {state === "idle" || state === "starting" ? (
        <button
          type="button"
          disabled={disabled || state === "starting"}
          onClick={() => void start()}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
        >
          {state === "starting" ? (
            <Loader2 className="size-5 animate-spin" />
          ) : (
            <Video className="size-5" />
          )}
          Start webcam
        </button>
      ) : state === "live" ? (
        <button
          type="button"
          disabled={disabled}
          onClick={record}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
        >
          <Video className="size-5" /> Start recording
        </button>
      ) : (
        <button
          type="button"
          onClick={stop}
          className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-red-500 font-display text-sm font-extrabold uppercase tracking-[0.12em] text-white"
        >
          <Square className="size-4" /> Stop and use clip
        </button>
      )}
    </div>
  );
}
