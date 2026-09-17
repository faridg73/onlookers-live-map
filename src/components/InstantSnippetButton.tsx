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
import { captureDurationSeconds, requestNativeCapture } from "@/lib/native-capture";
import {
  SNIPPET_SECONDS,
  feetAway,
  isSnippetInRange,
  payInstantSnippet,
} from "@/lib/instant-snippet";
import type { LiveRequest, MapPosition } from "@/lib/onlooker";

type Phase = "ready" | "capturing" | "sending";

/**
 * Appears only when the reporter is standing within 200 feet of the pin. Filming
 * happens in the phone's own camera app, and the clip is paid straight into their
 * wallet with no review step.
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

  const inRange = isSnippetInRange(userPosition, request);
  const positionRef = useRef(userPosition);
  positionRef.current = userPosition;

  const capture = useCallback(async () => {
    setPhase("capturing");
    let file: File | null = null;
    try {
      file = await requestNativeCapture("video");
    } catch {
      toast.error("Your camera could not be opened. Check camera permissions and try again.");
    }
    if (!file) {
      setPhase("ready");
      return;
    }

    setPhase("sending");
    try {
      const seconds = await captureDurationSeconds(file);
      const here = positionRef.current;
      const video = await uploadBountyVideo({
        file,
        request,
        note: `Instant snippet filmed at the pin (${Math.round(
          here ? feetAway(here, request) : 0,
        )} ft away).`,
        durationSeconds: seconds || SNIPPET_SECONDS,
      });
      const paid = await payInstantSnippet(video.id);
      toast.success(`Paid instantly, ${Math.round(paid)} Credits is in your wallet.`);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "That snippet could not be sent.");
    } finally {
      setPhase("ready");
    }
  }, [request]);

  // A push alert deep-link lands with the snippet sheet already open.
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
          if (!next && phase === "sending") return;
          setOpen(next);
        }}
      >
        <DialogContent onClick={(e) => e.stopPropagation()} className="max-w-md">
          <DialogHeader>
            <DialogTitle>Instant snippet · {request.bounty} Credits</DialogTitle>
            <DialogDescription>
              You are {Math.round(userPosition ? feetAway(userPosition, request) : 0)} ft from this
              spot. Film about {SNIPPET_SECONDS} seconds in your phone's camera and the money lands
              in your wallet right away - no review needed.
            </DialogDescription>
          </DialogHeader>

          <p className="text-xs text-muted-foreground">
            What to film: {request.title}, crowd atmosphere, street views, or the scene around
            the venue.
          </p>

          <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[0.7rem] font-medium leading-snug text-amber-300">
            {PUBLIC_SPACES_DISCLAIMER}
          </p>

          {phase === "sending" ? (
            <p className="flex h-12 items-center justify-center gap-2 text-sm font-semibold text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Sending and crediting your wallet…
            </p>
          ) : (
            <button
              type="button"
              disabled={phase === "capturing"}
              onClick={() => void capture()}
              className="flex h-12 items-center justify-center gap-2 rounded-lg bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
            >
              <Video className="size-4" /> Open camera and film
            </button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
