import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Radio, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { isSignedIn, readWalletBalance } from "@/lib/bounty-escrow";
import {
  FLASH_CREDITS,
  FLASH_DURATION_MINUTES,
  FLASH_TITLE,
  FLASH_WINDOW_MINUTES,
  postFlashBounty,
  readFlashSpot,
  type FlashSpot,
} from "@/lib/flash-bounty";
import { formatCreditCash, formatCredits } from "@/lib/credits";
import { useOnlooker } from "@/lib/onlooker-store";

/**
 * One-tap flash bounty. Tapping it grabs the poster's GPS straight away and
 * shows a single confirm button — no wizard, no fields — before the credits are
 * locked and every onlooker standing nearby gets a time-sensitive alert.
 */
export function FlashBountyButton({ variant }: { variant: "map" | "nav" }) {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState<FlashSpot | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);

  const findSpot = () => {
    setLocating(true);
    setLocateError(null);
    void readFlashSpot()
      .then(setSpot)
      .catch(() => setLocateError("Allow location access so onlookers know where to come."))
      .finally(() => setLocating(false));
  };

  useEffect(() => {
    if (!open) return;
    findSpot();
    void readWalletBalance().then(setBalance);
  }, [open]);

  const short = balance !== null && balance < FLASH_CREDITS;

  const post = async () => {
    if (!spot) return;
    setPosting(true);
    try {
      const locked = await postFlashBounty(spot);
      setBalance(locked.balance);
      addRequest({
        title: FLASH_TITLE,
        place: spot.formatted,
        note: `Live now — ${FLASH_DURATION_MINUTES} minute stream from this exact spot.`,
        bounty: FLASH_CREDITS,
        category: "events",
        dbId: locked.id,
        lat: spot.latitude,
        lng: spot.longitude,
        expiresInMin: FLASH_WINDOW_MINUTES,
      });
      setOpen(false);
      toast.success("Flash bounty is live", {
        description: `Onlookers near you were alerted. ${formatCredits(FLASH_CREDITS)} held in escrow for ${FLASH_WINDOW_MINUTES} minutes.`,
      });
      await navigate({ to: "/feed" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not post the flash bounty.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <>
      {variant === "map" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Flash bounty — something is happening here now"
          className="pointer-events-auto absolute bottom-28 right-4 z-30 flex flex-col items-center gap-1"
        >
          <span className="grid size-16 place-items-center rounded-full bg-signal text-signal-foreground shadow-xl shadow-signal/30 ring-4 ring-signal/25 transition-transform active:scale-95">
            <Zap className="size-7" strokeWidth={2.5} />
          </span>
          <span className="rounded-full bg-surface/90 px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-signal backdrop-blur">
            Flash
          </span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Flash bounty — something is happening here now"
          className="group flex w-full flex-col items-center gap-1 py-3 text-[0.58rem] font-extrabold uppercase tracking-[0.08em] text-signal"
        >
          <span className="grid size-8 place-items-center rounded-full bg-signal text-signal-foreground">
            <Zap className="size-5" strokeWidth={2.25} />
          </span>
          Flash
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl">
              <Zap className="size-6 text-signal" /> Happening here now
            </DialogTitle>
            <DialogDescription>
              One tap alerts every onlooker standing near you to go live from this exact spot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div className="rounded-2xl border-2 border-border bg-surface-raised p-3">
              <p className="flex items-start gap-2 text-sm font-bold text-foreground">
                <MapPin className="mt-0.5 size-4 shrink-0 text-signal" />
                {locating ? "Finding your exact spot…" : (spot?.formatted ?? "Location unavailable")}
              </p>
              {locateError && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-destructive">{locateError}</span>
                  <Button type="button" size="sm" variant="outline" onClick={findSpot}>
                    Retry
                  </Button>
                </div>
              )}
            </div>

            <ul className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <li className="flex items-center gap-2">
                <Radio className="size-3.5 text-signal" />
                Fast Catch tier — pushed to nearby onlookers first
              </li>
              <li className="flex items-center gap-2">
                <Radio className="size-3.5 text-signal" />
                {FLASH_DURATION_MINUTES}-minute live stream, expires in {FLASH_WINDOW_MINUTES} minutes
              </li>
            </ul>

            <div className="flex items-baseline justify-between rounded-2xl border-2 border-border bg-surface-raised p-3">
              <span className="text-sm font-extrabold text-foreground">Locked in escrow</span>
              <span className="font-display text-lg font-extrabold tabular-nums text-signal">
                {formatCredits(FLASH_CREDITS)} · {formatCreditCash(FLASH_CREDITS)}
              </span>
            </div>

            {short && (
              <p className="text-xs font-bold text-destructive">
                You have {formatCredits(Math.round(balance ?? 0))} — buy credits to post a flash bounty.
              </p>
            )}

            <Button
              type="button"
              onClick={() => void post()}
              disabled={posting || locating || !spot || short}
              className="h-12 w-full bg-signal font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
            >
              {posting ? "Broadcasting…" : `Go live here — lock ${formatCredits(FLASH_CREDITS)}`}
            </Button>
            {short && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full font-bold"
                onClick={() => {
                  setOpen(false);
                  void navigate({ to: "/balance" });
                }}
              >
                Buy credits
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
