// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { ArrowLeft, Camera, CoinsIcon, Loader2, MapPin, Radio, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useHumanCheck } from "@/components/HumanCheck";
import { ShareToSocialButton } from "@/components/ShareToSocialButton";
import { acceptBountyAndGoLive } from "@/lib/bounty-live.functions";


import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryBadge } from "@/components/CategoryBadge";
import { BountyBriefBadges } from "@/components/BountyBriefBadges";
import { LocationTypeBadge } from "@/components/LocationTypeBadge";
import { BountyNoteDetails } from "@/components/BountyNoteDetails";
import { ExpiryCountdown } from "@/components/ExpiryCountdown";
import { VideoRecorder } from "@/components/VideoRecorder";
import { bountyTier } from "@/lib/bounty-tiers";
import { PLATFORM_FEE_RATE } from "@/lib/credits";
import { uploadBountyVideo } from "@/lib/bounty-videos";
import { PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";
import { isClosed } from "@/lib/onlooker-store";
import type { LiveRequest } from "@/lib/onlooker";

/**
 * Bottom-sheet preview for a tapped map pin: what to film, the exact payout,
 * and one button that claims the bounty and opens the live camera.
 */
export function BountyBottomSheet({
  request,
  pool,
  distanceLabel,
  onClose,
  onClaim,
}: {
  request: LiveRequest | null;
  /** Total credit bounty including chip-ins. */
  pool: number;
  distanceLabel?: string | undefined;
  onClose: () => void;
  onClaim?: (id: string) => void;
}) {
  const [capturing, setCapturing] = useState(false);
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const human = useHumanCheck("accept-bounty");
  const router = useRouter();
  const navigate = useNavigate();

  /** Return to the exact previous page/view, with the map as a safe fallback. */
  function goBack() {
    if (window.history.length > 1) {
      router.history.back();
      return;
    }
    void navigate({ to: "/" });
  }

  if (!request) return null;

  const tier = bountyTier(pool);
  const payout = pool - Math.floor(pool * PLATFORM_FEE_RATE);
  const closed = isClosed(request);
  const claimable = !closed && request.status === "open";
  /** Funded pins ask for a live stream; everything else takes a recorded clip. */
  const wantsLive = request.bountyType === "live_stream";

  async function goLive() {
    const target = request!.dbId ?? request!.id;
    if (!human.ready) {
      toast.error("Finish the quick human check before you go live for this bounty.");
      return;
    }
    setAccepting(true);
    try {
      await acceptBountyAndGoLive({ data: { requestId: target, captchaToken: human.token } });
      human.reset();
      onClaim?.(request!.id);
      setCapturing(true);
      toast.success("You're live for this bounty", {
        description: `${payout} Credits are reserved for you, film the spot and send it in.`,
      });
    } catch (error) {
      human.reset();
      toast.error(error instanceof Error ? error.message : "Could not start this bounty stream.");
    } finally {
      setAccepting(false);
    }
  }

  function accept() {
    if (wantsLive) {
      void goLive();
      return;
    }
    onClaim?.(request!.id);
    setCapturing(true);
  }


  async function submit(file: File) {
    setSending(true);
    try {
      await uploadBountyVideo({
        file,
        request: request!,
        note: "Filmed live from the map after accepting the bounty.",
      });
      toast.success("Sent to the requester for review.");
      setCapturing(false);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That clip could not be sent.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) {
          setCapturing(false);
          onClose();
        }
      }}
    >
      <SheetContent
        side="bottom"
        className="flex max-h-[88dvh] flex-col rounded-t-3xl border-border bg-surface px-4 pb-[max(2rem,env(safe-area-inset-bottom))] sm:px-5"
      >
        {/* Back to the exact previous view, mirroring the built-in close button. */}
        <button
          type="button"
          onClick={goBack}
          aria-label="Go back to the previous page"
          className="absolute left-4 top-[max(1rem,env(safe-area-inset-top))] z-10 grid size-11 cursor-pointer place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
          <ArrowLeft className="size-5 text-signal" aria-hidden />
          <span className="sr-only">Back</span>
        </button>
        {/* Everything below the two header controls scrolls vertically. */}
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pt-14">
        <SheetHeader className="text-left">
          <div className="flex items-center gap-2">
            <CategoryBadge category={request.category} compact />
            {tier === "gold" && (
              <span
                className="rounded-full px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em]"
                style={{ backgroundColor: "var(--pin-gold)", color: "oklch(0.24 0.05 92)" }}
              >
                Gold bounty
              </span>
            )}
            {!closed && <ExpiryCountdown minutesLeft={request.expiresInMin} />}
          </div>
          <SheetTitle className="font-display text-2xl leading-tight">{request.title}</SheetTitle>
          <SheetDescription className="flex flex-wrap items-center gap-1.5 text-sm">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{request.place}</span>
            <LocationTypeBadge locationType={request.locationType} />
            {distanceLabel && <span className="text-signal">· {distanceLabel} away</span>}
          </SheetDescription>
        </SheetHeader>

        <BountyBriefBadges request={request} />

        {request.note && <BountyNoteDetails note={request.note} className="mt-3" />}

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            You earn
          </span>
          <span className="flex items-center gap-2 font-display text-3xl text-live">
            <CoinsIcon className="size-6" /> {payout}
          </span>
        </div>
        <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
          {pool} credit bounty · {payout} Credits paid to you once the requester approves your
          clip.
        </p>

        {capturing ? (
          <div className="mt-4">
            {sending ? (
              <p className="flex items-center justify-center gap-2 py-6 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Sending your clip…
              </p>
            ) : (
              <VideoRecorder
                onClose={() => setCapturing(false)}
                onRecorded={(file) => void submit(file)}
              />
            )}
          </div>
        ) : (
          <>
            {wantsLive && claimable && <div className="mt-4">{human.widget}</div>}
            <button
              type="button"
              disabled={!claimable || accepting}
              onClick={accept}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-live font-display text-base font-extrabold uppercase tracking-[0.1em] text-black disabled:opacity-50"
            >
              {wantsLive ? <Radio className="size-5" /> : <Camera className="size-5" />}
              {!claimable
                ? closed
                  ? "Closed"
                  : "Already claimed"
                : accepting
                  ? "Starting your live session…"
                  : wantsLive
                    ? "Go live for this bounty"
                    : "Accept & Open Camera"}
            </button>
            <div className="mt-3">
              <ShareToSocialButton
                subject={{
                  kind: wantsLive ? "live" : "pin",
                  id: request.dbId ?? request.id,
                  title: request.title,
                  place: request.place,
                  credits: pool,
                  latitude: request.lat ?? null,
                  longitude: request.lng ?? null,
                }}
                className="w-full"
              />
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-2xl border border-live/30 bg-surface-raised p-3.5">
              <ShieldCheck className="mt-0.5 size-5 shrink-0 text-live" />
              <p className="text-xs font-semibold leading-relaxed text-foreground">
                {PUBLIC_SPACES_DISCLAIMER}
              </p>
            </div>
          </>
        )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
