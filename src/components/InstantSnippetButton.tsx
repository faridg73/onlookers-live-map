import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, Video, Zap } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import { uploadBountyVideo } from "@/lib/bounty-videos";
import { PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";
import {
  SNIPPET_SECONDS,
  feetAway,
  isSnippetInRange,
  payInstantSnippet,
} from "@/lib/instant-snippet";
import type { LiveRequest, MapPosition } from "@/lib/onlooker";

type Phase = "ready" | "recording" | "sending";

/**
 * Appears only when the reporter is standing within 200 feet of the pin. The
 * ten-second clip is paid straight into their wallet with no review step.
 */
export function InstantSnippetButton({
  request,
  userPosition,
  autoStart = false,
}: {
  request: LiveRequest;
  userPosition: MapPosition | null;
  /** Opens the camera immediately (used by nearby-bounty push links). */
  autoStart?: boolean;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [countdown, setCountdown] = useState(SNIPPET_SECONDS);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);

  const inRange = isSnippetInRange(userPosition, request);

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  useEffect(() => stopStream, [stopStream]);

  const finish = useCallback(
    async (file: File) => {
      setPhase("sending");
      try {
        const video = await uploadBountyVideo({
          file,
          request,
          note: `Instant snippet filmed at the pin (${Math.round(
            userPosition ? feetAway(userPosition, request) : 0,
          )} ft away).`,
          durationSeconds: SNIPPET_SECONDS,
        });
        const paid = await payInstantSnippet(video.id);
        toast.success(`Paid instantly — ${Math.round(paid)} Credits is in your wallet.`);
        setOpen(false);
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "That snippet could not be sent.");
      } finally {
        setPhase("ready");
        setCountdown(SNIPPET_SECONDS);
        stopStream();
      }
    },
    [request, userPosition, stopStream],
  );

  const startRecording = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      toast.error("This device does not allow in-app recording.");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      const chunks: Blob[] = [];
      const recorder = new MediaRecorder(stream);
      recorderRef.current = recorder;
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };
      recorder.onstop = () => {
        const type = chunks[0]?.type || "video/webm";
        const blob = new Blob(chunks, { type });
        const ext = type.includes("mp4") ? "mp4" : "webm";
        void finish(new File([blob], `instant-snippet.${ext}`, { type }));
      };
      recorder.start();
      setPhase("recording");
      setCountdown(SNIPPET_SECONDS);
    } catch {
      toast.error("Camera access was blocked. Allow the camera to film a snippet.");
    }
  }, [finish]);

  // Ten-second countdown, then stop automatically.
  useEffect(() => {
    if (phase !== "recording") return;
    const timer = setInterval(() => {
      setCountdown((n) => {
        if (n <= 1) {
          clearInterval(timer);
          if (recorderRef.current?.state === "recording") recorderRef.current.stop();
          return 0;
        }
        return n - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase]);

  // A push alert deep-link lands with the camera already open.
  useEffect(() => {
    if (autoStart && inRange) setOpen(true);
  }, [autoStart, inRange]);

  if (!user || !inRange) return null;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        className="mt-3 flex w-full animate-pulse items-center justify-center gap-2 rounded-lg bg-live px-4 py-3 font-display text-sm font-extrabold uppercase tracking-[0.12em] text-background shadow-lg"
      >
        <Zap className="size-4" /> Instant Snippet Available!
      </button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next && phase !== "ready") return;
          setOpen(next);
          if (!next) stopStream();
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Instant snippet · {request.bounty} Credits</DialogTitle>
            <DialogDescription>
              You are {Math.round(userPosition ? feetAway(userPosition, request) : 0)} ft from this
              spot. Film {SNIPPET_SECONDS} seconds and the money lands in your wallet right away —
              no review needed.
            </DialogDescription>
          </DialogHeader>

          <div className="relative overflow-hidden rounded-2xl bg-black">
            <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
            {phase === "recording" && (
              <span className="absolute left-3 top-3 flex items-center gap-2 rounded-full bg-urgent px-3 py-1 font-display text-sm font-extrabold text-white">
                <span className="size-2 animate-ping rounded-full bg-white" /> {countdown}s
              </span>
            )}
          </div>

          <p className="text-xs text-muted-foreground">
            What to film: {request.title} — crowd atmosphere, street views, or the scene around
            the venue.
          </p>

          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[0.7rem] font-medium leading-snug text-amber-300">
            {PUBLIC_SPACES_DISCLAIMER}
          </p>

          {phase === "ready" && (
            <button
              type="button"
              onClick={() => void startRecording()}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
            >
              <Video className="size-4" /> Start {SNIPPET_SECONDS}-second capture
            </button>
          )}
          {phase === "recording" && (
            <button
              type="button"
              onClick={() => recorderRef.current?.stop()}
              className="h-12 rounded-lg border border-border font-display text-sm font-extrabold uppercase tracking-[0.12em] text-foreground"
            >
              Stop and send now
            </button>
          )}
          {phase === "sending" && (
            <p className="flex h-12 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Sending and crediting your wallet…
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
