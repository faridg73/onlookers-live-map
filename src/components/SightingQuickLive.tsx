// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, MapPin, Radio, X } from "lucide-react";
import { toast } from "sonner";

import { LiveBroadcastStage } from "@/components/LiveBroadcastStage";
import { SignInDialog } from "@/components/SignInDialog";
import { useAuth } from "@/hooks/use-auth";
import { describeBroadcastError, fetchBroadcastEligibility, startFreeBroadcast } from "@/lib/broadcast";
import { endBroadcast, pingBroadcast } from "@/lib/community";
import { requestCurrentPosition } from "@/lib/geolocation";
import { reverseGeocode } from "@/lib/geocode.functions";
import { BLOCKED_REQUEST_MESSAGE, isRequestAllowed } from "@/lib/moderation";
import { STRANGE_SIGHTINGS_ID, STRANGE_SIGHTINGS_LABEL, STRANGE_SIGHTINGS_SUBCATEGORIES } from "@/lib/strange-sightings";

type Spot = { latitude: number; longitude: number; formatted: string };

/**
 * Periscope-style instant launch for sudden sky sightings: tags, title, public
 * audience and GPS are filled in automatically — one tap starts filming.
 */
export function SightingQuickLive({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [signInOpen, setSignInOpen] = useState(!user);
  const [spot, setSpot] = useState<Spot | null>(null);
  const [gpsState, setGpsState] = useState<"busy" | "ok" | "failed">("busy");
  const [title, setTitle] = useState("🛸 Live sighting");
  const [titleEdited, setTitleEdited] = useState(false);
  const [sub, setSub] = useState<string>(STRANGE_SIGHTINGS_SUBCATEGORIES[0]);
  const [starting, setStarting] = useState(false);
  const [live, setLive] = useState<{ postId: string; key: string; title: string; place: string } | null>(null);

  useEffect(() => {
    if (user) setSignInOpen(false);
  }, [user]);

  // Grab location silently in the background as soon as the launcher opens.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const pos = await requestCurrentPosition();
        const { latitude, longitude } = pos.coords;
        const found = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
        if (cancelled) return;
        const formatted = found?.formatted ?? "My current location";
        setSpot({ latitude, longitude, formatted });
        setGpsState("ok");
        const area = formatted.split(",").slice(-3, -1).join(",").trim() || formatted.split(",")[0];
        setTitle((t) => (titleEdited ? t : `🛸 Live sighting over ${area}`));
      } catch {
        if (!cancelled) setGpsState("failed");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Heartbeat keeps the stream in "Live now" while the camera is on.
  useEffect(() => {
    const postId = live?.postId;
    if (!postId) return;
    void pingBroadcast(postId);
    const timer = window.setInterval(() => void pingBroadcast(postId), 30_000);
    return () => {
      window.clearInterval(timer);
      void endBroadcast(postId);
    };
  }, [live?.postId]);

  const start = async () => {
    if (!user) {
      setSignInOpen(true);
      return;
    }
    if (!spot) {
      toast.error("Allow location access so viewers know where the sighting is.");
      return;
    }
    const finalTitle = title.trim().length >= 4 ? title.trim() : "🛸 Live sighting";
    if (!isRequestAllowed(finalTitle, "", spot.formatted)) {
      toast.error(BLOCKED_REQUEST_MESSAGE, { duration: 12000 });
      return;
    }
    setStarting(true);
    try {
      const eligibility = await fetchBroadcastEligibility();
      if (!eligibility.allowed) {
        toast.error(eligibility.reason || "You can't start filming right now.");
        return;
      }
      const postId = await startFreeBroadcast({
        category: "general",
        title: finalTitle,
        body: `${STRANGE_SIGHTINGS_LABEL} · ${sub}`,
        place: spot.formatted,
        hours: 1,
        audience: "public",
        tags: [STRANGE_SIGHTINGS_ID, "strange sighting", "ufo", sub.toLowerCase()],
        latitude: spot.latitude,
        longitude: spot.longitude,
      });
      setLive({ postId, key: `broadcast-${Date.now()}`, title: finalTitle, place: spot.formatted });
    } catch (error) {
      toast.error(describeBroadcastError(error));
    } finally {
      setStarting(false);
    }
  };

  if (live) {
    return (
      <LiveBroadcastStage
        title={live.title}
        place={live.place}
        save={live.key}
        onEnd={(result) => {
          setLive(null);
          if (result?.saved) toast.success("Sighting saved and shared publicly.");
          onClose();
        }}
      />
    );
  }

  const panel = (
    <div className="fixed inset-0 z-[80] flex flex-col bg-background">
      <div className="flex items-center gap-2 px-4 pb-2 pt-[max(1rem,env(safe-area-inset-top))]">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-destructive/20 px-2.5 py-1 text-[0.6rem] font-bold uppercase tracking-[0.14em] text-destructive">
          <Radio className="size-3" /> Sky sighting · Public
        </span>
        <button
          type="button"
          aria-label="Close"
          onClick={onClose}
          className="ml-auto grid size-11 place-items-center rounded-full border border-border bg-secondary/80 text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col justify-center gap-4 overflow-y-auto px-5">
        <input
          value={title}
          maxLength={80}
          aria-label="Stream title"
          onChange={(e) => {
            setTitleEdited(true);
            setTitle(e.target.value);
          }}
          className="w-full rounded-xl border border-border bg-surface px-3 py-3 text-base font-extrabold text-foreground focus:border-signal focus:outline-none"
        />
        <div className="flex flex-wrap gap-1.5">
          {STRANGE_SIGHTINGS_SUBCATEGORIES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSub(s)}
              className={`rounded-full border px-3 py-1.5 text-xs font-bold ${
                sub === s ? "border-signal bg-signal text-signal-foreground" : "border-border text-foreground"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
          {gpsState === "busy" ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
          {gpsState === "busy"
            ? "Finding your location…"
            : gpsState === "ok"
              ? spot?.formatted
              : "Location blocked — allow location access and reopen."}
        </p>
        <p className="text-[0.7rem] text-muted-foreground">Free · no credits · everyone can watch.</p>
      </div>

      <div className="px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-3">
        <button
          type="button"
          disabled={starting || gpsState === "busy"}
          onClick={() => void start()}
          className="flex h-16 w-full items-center justify-center gap-2 rounded-2xl bg-destructive font-display text-lg font-extrabold uppercase tracking-[0.12em] text-destructive-foreground disabled:opacity-60"
        >
          {starting ? <Loader2 className="size-5 animate-spin" /> : <Radio className="size-6" />} Start stream
        </button>
      </div>
      <SignInDialog
        open={signInOpen}
        onOpenChange={(o) => {
          setSignInOpen(o);
          if (!o && !user) onClose();
        }}
        title="Sign in to go live"
        message="Sign in once and your sighting stream starts right away."
      />
    </div>
  );

  return typeof document === "undefined" ? panel : createPortal(panel, document.body);
}
