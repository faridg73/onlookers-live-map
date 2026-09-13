import { useCallback, useEffect, useRef, useState } from "react";
import { Camera, Circle, Loader2, Square, X } from "lucide-react";
import { toast } from "sonner";

import { MAX_CLIP_SECONDS } from "@/lib/video-compress";

/**
 * In-app camera for chat clips. Recording stops on its own at 60 seconds and
 * records at a modest bitrate so uploads stay quick. It is the only way media
 * enters Onlooker Live — nothing can come from the photo gallery.
 */
export function VideoRecorder({
  onClose,
  onRecorded,
  onPhoto,
}: {
  onClose: () => void;
  onRecorded: (file: File) => void;
  /** When provided, a shutter button grabs a still frame from the live camera. */
  onPhoto?: (file: File) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch {
        toast.error("Camera access was blocked. Allow the camera to record a clip.");
        onClose();
      }
    })();
    return () => {
      alive = false;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [onClose]);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      recorderRef.current.stop();
    }
    setRecording(false);
  }, []);

  useEffect(() => {
    if (!recording) return;
    const timer = setInterval(() => {
      setSeconds((value) => {
        const next = value + 1;
        if (next >= MAX_CLIP_SECONDS) stop();
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [recording, stop]);

  function start() {
    const stream = streamRef.current;
    if (!stream) return;
    const candidates = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
    const mimeType = candidates.find((type) => MediaRecorder.isTypeSupported(type));
    if (!mimeType) {
      toast.error("This browser can't record video. Attach a file instead.");
      return;
    }
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, {
      mimeType,
      videoBitsPerSecond: 900_000,
      audioBitsPerSecond: 64_000,
    });
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      setSaving(true);
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const ext = mimeType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `clip-${Date.now()}.${ext}`, { type: blob.type });
      setSaving(false);
      if (file.size > 0) onRecorded(file);
      onClose();
    };
    recorderRef.current = recorder;
    recorder.start(500);
    setSeconds(0);
    setRecording(true);
  }

  const remaining = Math.max(0, MAX_CLIP_SECONDS - seconds);

  return (
    <div className="fixed inset-0 z-[70] flex flex-col bg-black">
      <div className="flex items-center justify-between px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/80">
          {recording ? `Recording · ${remaining}s left` : `Max ${MAX_CLIP_SECONDS}s`}
        </p>
        <button
          type="button"
          aria-label="Close camera"
          onClick={() => {
            stop();
            onClose();
          }}
          className="rounded-full bg-white/10 p-2 text-white"
        >
          <X className="size-4" />
        </button>
      </div>

      <video ref={videoRef} muted playsInline className="min-h-0 flex-1 object-cover" />

      <div className="flex items-center justify-center px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        {saving ? (
          <Loader2 className="size-8 animate-spin text-white" />
        ) : recording ? (
          <button
            type="button"
            aria-label="Stop recording"
            onClick={stop}
            className="inline-flex size-16 items-center justify-center rounded-full bg-destructive text-white"
          >
            <Square className="size-6" />
          </button>
        ) : (
          <button
            type="button"
            aria-label="Start recording"
            disabled={!ready}
            onClick={start}
            className="inline-flex size-16 items-center justify-center rounded-full bg-signal text-signal-foreground disabled:opacity-50"
          >
            <Circle className="size-6" />
          </button>
        )}
      </div>
    </div>
  );
}
