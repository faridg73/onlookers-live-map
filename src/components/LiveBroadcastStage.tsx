import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MessageCircle, Radio, Video, X } from "lucide-react";
import { toast } from "sonner";

import { BountyChat } from "@/components/BountyChat";
import { PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";
import {
  captureDurationSeconds,
  isMobileCaptureDevice,
  requestNativeCapture,
} from "@/lib/native-capture";
import { DesktopWebcamRecorder } from "@/components/DesktopWebcamRecorder";

/**
 * Full-screen stage for a broadcast. The capture itself is handed to the phone's
 * native camera app (file input with `capture="environment"`), so the clip keeps
 * native quality and stabilisation. Once the person finishes filming, the clip is
 * saved and the stage closes.
 */
export function LiveBroadcastStage({
  title,
  place,
  onEnd,
  requestKey = null,
  instructions = null,
  save = null,
  bounty = 0,
}: {
  title: string;
  place: string;
  onEnd: () => void;
  /** Camera side chosen in the pre-stream checks (handled by the native camera). */
  initialFacing?: "environment" | "user";
  /** Mic state chosen in the pre-stream checks (handled by the native camera). */
  initialMuted?: boolean;
  /** Bounty this stream belongs to; unlocks the live chat with the other side. */
  requestKey?: string | null;
  /** Directions the poster left for the onlooker. */
  instructions?: string | null;
  /** Storage key the finished recording is filed under; null skips saving. */
  save?: string | null;
  /** Credits attached to this stream, stored with the saved recording. */
  bounty?: number;
}) {
  const [chatOpen, setChatOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const opened = useRef(false);

  // The parent re-renders on background polling and passes a fresh onEnd every
  // time, so it is kept in a ref and never restarts the capture flow.
  const onEndRef = useRef(onEnd);
  useEffect(() => {
    onEndRef.current = onEnd;
  }, [onEnd]);

  const meta = useRef({ title, place, bounty, save });
  meta.current = { title, place, bounty, save };

  const handleFile = useCallback(async (file: File) => {
    const key = meta.current.save;
    if (key) {
      setSaving(true);
      try {
        const seconds = await captureDurationSeconds(file);
        const { saveBroadcastRecording } = await import("@/lib/bounty-videos");
        await saveBroadcastRecording({
          blob: file,
          seconds,
          requestId: key,
          title: meta.current.title,
          place: meta.current.place,
          bounty: meta.current.bounty,
        });
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Couldn't save your stream recording.",
        );
      } finally {
        setSaving(false);
      }
    }
    onEndRef.current();
  }, []);

  const capture = useCallback(async () => {
    setCapturing(true);
    let file: File | null = null;
    try {
      file = await requestNativeCapture("video");
    } catch {
      toast.error("Your camera could not be opened. Check camera permissions and try again.");
    } finally {
      setCapturing(false);
    }
    if (file) await handleFile(file);
  }, [handleFile]);

  // On phones the camera app opens right away — the tap that started the
  // broadcast counts as the user gesture. Computers wait for a button instead.
  useEffect(() => {
    if (opened.current || !isMobileCaptureDevice()) return;
    opened.current = true;
    const id = requestAnimationFrame(() => void capture());
    return () => cancelAnimationFrame(id);
  }, [capture]);

  const [isMobile, setIsMobile] = useState(true);
  useEffect(() => {
    setIsMobile(isMobileCaptureDevice());
  }, []);

  const stage = (
    <div className="fixed inset-0 z-[80] flex flex-col bg-black">
      <div className="flex items-center gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/20 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-red-400">
          <Radio className="size-3" /> capture
        </span>
        <span className="ml-auto truncate text-xs font-medium text-white/70">{place}</span>
        <button
          type="button"
          aria-label="Close capture"
          disabled={saving}
          onClick={() => onEndRef.current()}
          className="rounded-full bg-white/10 p-2 text-white disabled:opacity-50"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="relative flex min-h-0 flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        {saving || capturing ? (
          <Loader2 className="size-9 animate-spin text-white/80" />
        ) : (
          <Video className="size-10 text-white/70" />
        )}
        <p className="text-sm font-extrabold text-white">{title}</p>
        <p className="text-xs leading-relaxed text-white/65">
          {saving
            ? "Saving your clip…"
            : "Your phone's camera app handles the filming. Tap use or done when you finish and the clip is saved here."}
        </p>
        {instructions?.trim() && (
          <p className="rounded-xl border border-signal/40 bg-black/60 px-3 py-2 text-[0.7rem] font-medium leading-snug text-white/85">
            <span className="font-extrabold text-signal">Instructions: </span>
            {instructions.trim()}
          </p>
        )}

        {requestKey && chatOpen && (
          <div className="absolute inset-x-0 bottom-0 max-h-[65%] overflow-y-auto rounded-t-3xl border-t-2 border-border bg-surface px-3 pb-3 pt-2 text-left">
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

      <div className="flex items-center justify-center gap-4 px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          disabled={saving || capturing}
          onClick={() => void capture()}
          className="flex h-14 flex-1 items-center justify-center gap-2 rounded-2xl bg-signal font-display text-sm font-extrabold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
        >
          <Video className="size-5" /> Open camera
        </button>
        {requestKey && (
          <button
            type="button"
            aria-label={chatOpen ? "Hide live chat" : "Open live chat"}
            onClick={() => setChatOpen((v) => !v)}
            className={`inline-flex size-14 items-center justify-center rounded-full border ${
              chatOpen ? "border-signal bg-signal/20 text-signal" : "border-white/40 text-white"
            }`}
          >
            <MessageCircle className="size-5" />
          </button>
        )}
      </div>
    </div>
  );

  // Portalled to the body so a positioned/transformed parent (like the map
  // overlay) can never clip or shrink the full-screen stage.
  return typeof document === "undefined" ? stage : createPortal(stage, document.body);
}
