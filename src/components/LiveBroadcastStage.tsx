import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Loader2,
  MessageCircle,
  Mic,
  MicOff,
  Radio,
  SwitchCamera,
  Square,
  X,
} from "lucide-react";
import { toast } from "sonner";

import { BountyChat } from "@/components/BountyChat";
import { PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";

/**
 * Full-screen live stage shown while a free broadcast is running. It opens the
 * real camera with getUserMedia (WebRTC media capture, the same API the native
 * shells expose) so the creator can see exactly what viewers see.
 */
export function LiveBroadcastStage({
  title,
  place,
  onEnd,
  initialFacing = "environment",
  initialMuted = false,
  requestKey = null,
  instructions = null,
}: {
  title: string;
  place: string;
  onEnd: () => void;
  /** Camera side chosen in the pre-stream checks. */
  initialFacing?: "environment" | "user";
  /** Mic state chosen in the pre-stream checks. */
  initialMuted?: boolean;
  /** Bounty this stream belongs to; unlocks the live chat with the other side. */
  requestKey?: string | null;
  /** Directions the poster left for the onlooker. */
  instructions?: string | null;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">(initialFacing);
  const [ready, setReady] = useState(false);
  const [switching, setSwitching] = useState(false);
  const [multiCamera, setMultiCamera] = useState(false);
  const [muted, setMuted] = useState(initialMuted);
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facing },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: true,
        });
        if (!alive) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current?.getTracks().forEach((t) => t.stop());
        streamRef.current = stream;
        stream.getAudioTracks().forEach((t) => (t.enabled = !muted));
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
        setSwitching(false);
        void navigator.mediaDevices
          .enumerateDevices()
          .then((devices) => {
            if (alive) setMultiCamera(devices.filter((d) => d.kind === "videoinput").length > 1);
          })
          .catch(() => undefined);
      } catch {
        if (!alive) return;
        setSwitching(false);
        if (streamRef.current) {
          setReady(true);
          toast.error("This device only has one camera available.");
          setFacing((current) => (current === "environment" ? "user" : "environment"));
          return;
        }
        toast.error("Allow camera and microphone access to show your live feed.");
        onEnd();
      }
    })();
    return () => {
      alive = false;
    };
    // muted is applied to tracks separately; re-running on it would restart the camera.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facing, onEnd]);

  // Release the camera when the stage closes.
  useEffect(
    () => () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    },
    [],
  );

  useEffect(() => {
    const timer = setInterval(() => setSeconds((value) => value + 1), 1000);
    return () => clearInterval(timer);
  }, []);

  const toggleMic = useCallback(() => {
    setMuted((current) => {
      const next = !current;
      streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = !next));
      return next;
    });
  }, []);

  const flipCamera = useCallback(() => {
    setSwitching(true);
    setReady(false);
    setFacing((current) => (current === "environment" ? "user" : "environment"));
  }, []);

  const clock = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;

  const stage = (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div className="flex items-center gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-red-400">
          <Radio className="size-3" /> live
        </span>
        <span className="text-xs font-semibold tabular-nums text-white/80">{clock}</span>
        <span className="ml-auto truncate text-xs font-medium text-white/70">{place}</span>
      </div>

      <div className="relative min-h-0 flex-1">
        <video
          ref={videoRef}
          muted
          playsInline
          className={`size-full object-cover transition-opacity duration-200 ${
            switching ? "opacity-0" : "opacity-100"
          } ${facing === "user" ? "-scale-x-100" : ""}`}
        />
        {switching && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Loader2 className="size-8 animate-spin text-white/80" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 space-y-1.5 bg-gradient-to-t from-black/85 to-transparent px-4 pb-3 pt-8">
          {instructions?.trim() && (
            <p className="rounded-xl border border-signal/40 bg-black/60 px-2.5 py-1.5 text-[0.7rem] font-medium leading-snug text-white/85">
              <span className="font-extrabold text-signal">Instructions: </span>
              {instructions.trim()}
            </p>
          )}
          <p className="truncate text-sm font-extrabold text-white">{title}</p>
        </div>

        {requestKey && chatOpen && (
          <div className="absolute inset-x-0 bottom-0 top-auto max-h-[65%] overflow-y-auto rounded-t-3xl border-t-2 border-border bg-surface px-3 pb-3 pt-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                Live chat
              </p>
              <button
                type="button"
                aria-label="Close live chat"
                onClick={() => setChatOpen(false)}
                className="grid size-8 place-items-center rounded-full border border-border text-muted-foreground"
              >
                <X className="size-4" />
              </button>
            </div>
            <BountyChat requestKey={requestKey} bare />
          </div>
        )}
      </div>

      <p className="px-4 pb-1 text-center text-[0.7rem] font-medium leading-snug text-amber-300">
        {PUBLIC_SPACES_DISCLAIMER}
      </p>


      <div className="flex items-center justify-center gap-6 px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          aria-label={muted ? "Unmute microphone" : "Mute microphone"}
          onClick={toggleMic}
          className="inline-flex size-12 items-center justify-center rounded-full border border-white/40 text-white"
        >
          {muted ? <MicOff className="size-5" /> : <Mic className="size-5" />}
        </button>
        <button
          type="button"
          aria-label="End broadcast"
          disabled={!ready}
          onClick={onEnd}
          className="inline-flex size-16 items-center justify-center rounded-full bg-destructive text-white disabled:opacity-50"
        >
          <Square className="size-6" />
        </button>
        {multiCamera && (
          <button
            type="button"
            aria-label={facing === "environment" ? "Switch to front camera" : "Switch to rear camera"}
            disabled={switching}
            onClick={flipCamera}
            className="inline-flex size-12 items-center justify-center rounded-full border border-white/40 text-white disabled:opacity-50"
          >
            <SwitchCamera className="size-5" />
          </button>
        )}
      </div>
    </div>
  );

  // Portalled to the body so a positioned/transformed parent (like the map
  // overlay) can never clip or shrink the full-screen stage.
  return typeof document === "undefined" ? stage : createPortal(stage, document.body);
}
