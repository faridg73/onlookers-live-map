import { useState } from "react";
import { Camera, CoinsIcon, Loader2, MapPin, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { CategoryBadge } from "@/components/CategoryBadge";
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

  if (!request) return null;

  const tier = bountyTier(pool);
  const payout = pool - Math.floor(pool * PLATFORM_FEE_RATE);
  const closed = isClosed(request);
  const claimable = !closed && request.status === "open";

  function accept() {
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
      <SheetContent side="bottom" className="rounded-t-3xl border-border bg-surface px-5 pb-8">
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
          <SheetDescription className="flex items-center gap-1.5 text-sm">
            <MapPin className="size-4 shrink-0" />
            <span className="truncate">{request.place}</span>
            {distanceLabel && <span className="text-signal">· {distanceLabel} away</span>}
          </SheetDescription>
        </SheetHeader>

        {request.note && (
          <p className="mt-3 rounded-2xl border border-border bg-surface-raised p-3 text-sm leading-relaxed text-foreground/85">
            {request.note}
          </p>
        )}

        <div className="mt-4 flex items-center justify-between rounded-2xl border border-border bg-surface-raised px-4 py-3">
          <span className="text-xs uppercase tracking-[0.14em] text-muted-foreground">
            You earn
          </span>
          <span className="flex items-center gap-2 font-display text-3xl text-live">
            <Credits className="size-6" /> {payout}
          </span>
        </div>
        <p className="mt-1.5 text-[0.7rem] text-muted-foreground">
          {pool} credit bounty · {payout} Looker Credits paid to you once the requester approves your
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
            <button
              type="button"
              disabled={!claimable}
              onClick={accept}
              className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-live font-display text-base font-extrabold uppercase tracking-[0.1em] text-black disabled:opacity-50"
            >
              <Camera className="size-5" />
              {claimable ? "Accept & Open Camera" : closed ? "Closed" : "Already claimed"}
            </button>
            <p className="mt-2 flex items-start gap-2 text-[0.7rem] text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-3.5 shrink-0 text-live" />
              {PUBLIC_SPACES_DISCLAIMER}
            </p>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
