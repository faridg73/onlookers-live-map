import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { MapPin, Radio, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHumanCheck } from "@/components/HumanCheck";
import { isSignedIn, readWalletBalance } from "@/lib/bounty-escrow";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import {
  computeFlashCredits,
  DEFAULT_CUSTOM_BASE,
  DEFAULT_FLASH_TIER,
  FLASH_DURATION_MINUTES,
  FLASH_MIN_BOUNTY_CREDITS,
  FLASH_TIERS,
  FLASH_TITLE,
  FLASH_WINDOW_MINUTES,
  postFlashBounty,
  quoteFlashBounty,
  readFlashSpot,
  type FlashSpot,
  type FlashTierPreset,
} from "@/lib/flash-bounty";
import {
  CREDITS_PER_USD,
  formatCreditCash,
  formatCredits,
} from "@/lib/credits";

import { useOnlooker } from "@/lib/onlooker-store";
import { cn } from "@/lib/utils";

/**
 * One-tap flash bounty. Tapping it grabs the poster's GPS straight away and
 * shows a single confirm button — no wizard, no fields — before the credits are
 * locked and every onlooker standing nearby gets a time-sensitive alert.
 */
export function FlashBountyButton({ variant }: { variant: "map" | "nav" }) {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    console.log("[FlashBountyButton] open changed to", open);
  }, [open]);
  const [spot, setSpot] = useState<FlashSpot | null>(null);
  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [posting, setPosting] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [selectedTier, setSelectedTier] = useState<FlashTierPreset>(
    FLASH_TIERS.find((t) => t.id === DEFAULT_FLASH_TIER) ?? FLASH_TIERS[1]!,
  );
  const [customBase, setCustomBase] = useState<string>(String(DEFAULT_CUSTOM_BASE));
  const [customError, setCustomError] = useState<string | null>(null);
  const human = useHumanCheck("flash-bounty");

  const options = useMemo(
    () => ({
      tierId: selectedTier.id,
      customBase: selectedTier.baseCredits ?? Math.max(0, Math.round(Number(customBase) || 0)),
    }),
    [selectedTier, customBase],
  );

  const quote = useMemo(() => quoteFlashBounty(options), [options]);
  const totalCredits = quote.total;
  const isCustom = selectedTier.id === "standard";

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
    void isSignedIn().then(setSignedIn);
    void readWalletBalance().then(setBalance);
  }, [open]);

  useEffect(() => {
    if (!isCustom) {
      setCustomError(null);
      return;
    }
    const n = Number(customBase);
    if (!Number.isFinite(n) || !Number.isInteger(n) || n < FLASH_MIN_BOUNTY_CREDITS) {
      setCustomError(
        `Enter a whole number of credits (minimum ${FLASH_MIN_BOUNTY_CREDITS}).`,
      );
    } else {
      setCustomError(null);
    }
  }, [isCustom, customBase]);


  const short = balance !== null && balance < totalCredits;
  const canSubmit =
    !posting &&
    !locating &&
    spot !== null &&
    balance !== null &&
    balance >= totalCredits &&
    human.ready &&
    (!isCustom || customError === null);

  const post = async () => {
    if (signedIn === false) {
      setOpen(false);
      toast.error("Sign in to post a flash bounty", {
        description: "Your credits stay in escrow, so we need your account first.",
      });
      await navigate({ to: "/auth" });
      return;
    }
    if (!spot) {
      toast.error(
        locateError ??
          (locating
            ? "Still finding your exact spot — hang on a moment."
            : "We couldn't pin your location. Tap Retry above."),
      );
      return;
    }
    if (balance === null) {
      toast.error("We're still loading your Credit balance — try again in a moment.");
      return;
    }
    if (isCustom && customError) {
      toast.error(customError);
      return;
    }
    if (short) {
      toast.error(
        `Not enough Credits — this flash bounty locks ${formatCredits(
          totalCredits,
        )} and you have ${formatCredits(Math.round(balance))}. Buy credits to go live here.`,
      );
      return;
    }
    if (!human.ready) {
      toast.error("Finish the quick human check before going live.");
      return;
    }
    setPosting(true);
    try {
      const check = await verifyHumanCheck({
        data: { token: human.token ?? "", action: "flash-bounty" },
      });
      if (!check.ok) throw new Error("The human check didn't pass. Please try again.");
      const locked = await postFlashBounty(spot, options);
      setBalance(locked.balance);
      addRequest({
        title: FLASH_TITLE,
        place: spot.formatted,
        note: `Live now — ${FLASH_DURATION_MINUTES} minute stream from this exact spot.`,
        bounty: totalCredits,
        category: "events",
        dbId: locked.id,
        lat: spot.latitude,
        lng: spot.longitude,
        expiresInMin: FLASH_WINDOW_MINUTES,
      });
      human.reset();
      setOpen(false);
      toast.success("Flash bounty is live", {
        description: `Onlookers near you were alerted. ${formatCredits(
          totalCredits,
        )} held in escrow for ${FLASH_WINDOW_MINUTES} minutes.`,
      });
      await navigate({ to: "/feed" });
    } catch (error) {
      human.reset();
      toast.error(error instanceof Error ? error.message : "Could not post the flash bounty.");
    } finally {
      setPosting(false);
    }
  };

  console.log("[FlashBountyButton] render variant=", variant, "open=", open);
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
          onClick={() => {
            console.log("[FlashBountyButton] nav click, setting open=true");
            setOpen(true);
          }}
          onMouseDown={() => console.log("[FlashBountyButton] nav mousedown")}
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

          <div className="space-y-4">
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

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                Choose bounty tier
              </p>
              <div className="grid grid-cols-3 gap-2">
                {FLASH_TIERS.map((tier) => {
                  const active = selectedTier.id === tier.id;
                  const customAmount = Math.max(
                    0,
                    Math.round(Number(customBase) || 0),
                  );
                  const credits = tier.baseCredits ?? computeFlashCredits({
                    tierId: tier.id,
                    customBase: customAmount,
                  });
                  const display = tier.baseCredits
                    ? credits.toLocaleString()
                    : customAmount >= FLASH_MIN_BOUNTY_CREDITS
                      ? customAmount.toLocaleString()
                      : "Custom";
                  return (
                    <button
                      key={tier.id}
                      type="button"
                      onClick={() => setSelectedTier(tier)}
                      className={cn(
                        "relative flex flex-col items-center gap-1 rounded-2xl border-2 p-3 text-left transition-colors",
                        active
                          ? "border-signal bg-signal/10 text-foreground"
                          : "border-border bg-surface-raised text-muted-foreground hover:border-signal/50 hover:text-foreground",
                      )}
                    >
                      <span className="text-xs font-extrabold">{tier.label}</span>
                      <span className="font-display text-lg font-extrabold tabular-nums text-signal">
                        {display}
                      </span>
                      <span className="text-[0.6rem] font-medium leading-tight opacity-80">
                        {tier.blurb}
                      </span>
                    </button>
                  );
                })}

              </div>
            </div>

            {isCustom && (
              <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
                <label htmlFor="flash-custom-amount" className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Custom amount
                </label>
                <div className="flex items-center gap-2">
                <Input
                    id="flash-custom-amount"
                    type="number"
                    min={FLASH_MIN_BOUNTY_CREDITS}
                    step={1}
                    value={customBase}
                    onChange={(e) => setCustomBase(e.target.value)}
                    placeholder={`Minimum ${FLASH_MIN_BOUNTY_CREDITS}`}
                    className={cn(
                      "h-11 rounded-xl border-2 bg-surface text-right font-display text-lg font-extrabold tabular-nums",
                      customError ? "border-destructive focus-visible:ring-destructive" : "border-border",
                    )}
                  />
                  <span className="shrink-0 text-sm font-bold text-muted-foreground">Credits</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  ≈ {formatCreditCash(Math.max(0, Math.round(Number(customBase) || 0)))} USD at {CREDITS_PER_USD} Credits per $1
                </p>
                <p className="text-xs font-medium text-signal">
                  Minimum escrow: {FLASH_MIN_BOUNTY_CREDITS} Credits
                </p>
                {customError && (
                  <p className="text-xs font-bold text-destructive">{customError}</p>
                )}

              </div>
            )}

            <ul className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <li className="flex items-center gap-2">
                <Radio className="size-3.5 text-signal" />
                {selectedTier.blurb}
              </li>
              <li className="flex items-center gap-2">
                <Radio className="size-3.5 text-signal" />
                {FLASH_DURATION_MINUTES}-minute live stream, expires in {FLASH_WINDOW_MINUTES} minutes
              </li>
            </ul>

            <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-foreground">Your balance</span>
                <span className={cn(
                  "font-display text-lg font-extrabold tabular-nums",
                  short ? "text-destructive" : "text-signal",
                )}>
                  {balance === null ? "…" : formatCredits(Math.round(balance))}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-extrabold text-foreground">Locked in escrow</span>
                <span className="font-display text-lg font-extrabold tabular-nums text-signal">
                  {formatCredits(totalCredits)} · {formatCreditCash(totalCredits)}
                </span>
              </div>
              {quote.lines.length > 1 && (
                <div className="space-y-1 border-t border-border pt-2">
                  {quote.lines.map((line, i) => (
                    <div key={i} className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{line.label}</span>
                      <span className="font-bold tabular-nums text-foreground">
                        {line.runningTotal.toLocaleString()} Credits
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {short && balance !== null && (
              <p className="text-xs font-bold text-destructive">
                You need {formatCredits(Math.ceil(totalCredits - balance))} more to lock this flash bounty.
              </p>
            )}


            <div>{human.widget}</div>

            <Button
              type="button"
              onClick={() => void post()}
              disabled={!canSubmit}
              className="h-12 w-full bg-signal font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
            >
              {posting ? "Broadcasting…" : `Go live here — lock ${formatCredits(totalCredits)}`}
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
