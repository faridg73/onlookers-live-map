import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { LocateFixed, MapPin, Radar, Timer, Zap } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PlaceSearchInput } from "@/components/PlaceSearchInput";
import { LocationPreviewMap } from "@/components/LocationPreviewMap";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useHumanCheck } from "@/components/HumanCheck";
import { usePhoneGate } from "@/components/PhoneGate";
import { isSignedIn, readWalletBalance } from "@/lib/bounty-escrow";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import {
  computeFlashCredits,
  DEFAULT_CUSTOM_BASE,
  DEFAULT_FLASH_TIER,
  FLASH_CONDITIONS,
  flashConditionsCredits,
  FLASH_DURATION_MINUTES,
  FLASH_MIN_BOUNTY_CREDITS,
  FLASH_TIERS,
  FLASH_TITLE,
  FLASH_WINDOW_MINUTES,
  postFlashBounty,
  quoteFlashBounty,
  readFlashSpot,
  type FlashConditionId,
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
  const [spot, setSpot] = useState<FlashSpot | null>(null);
  const [locationQuery, setLocationQuery] = useState("");

  const [locating, setLocating] = useState(false);
  const [locateError, setLocateError] = useState<string | null>(null);
  const [balance, setBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [posting, setPosting] = useState(false);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [selectedTier, setSelectedTier] = useState<FlashTierPreset>(
    FLASH_TIERS.find((t) => t.id === DEFAULT_FLASH_TIER) ?? FLASH_TIERS[1]!,
  );
  const [customBase, setCustomBase] = useState<string>(String(DEFAULT_CUSTOM_BASE));
  const [customError, setCustomError] = useState<string | null>(null);
  const [conditionIds, setConditionIds] = useState<FlashConditionId[]>([]);
  const toggleCondition = (id: FlashConditionId) =>
    setConditionIds((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  const human = useHumanCheck("flash-bounty");
  // Credits only leave a wallet once the number behind the account is confirmed.
  const phoneGate = usePhoneGate("before credits go into escrow");

  const options = useMemo(
    () => ({
      tierId: selectedTier.id,
      customBase: selectedTier.baseCredits ?? Math.max(0, Math.round(Number(customBase) || 0)),
      conditionIds,
    }),
    [selectedTier, customBase, conditionIds],
  );

  const quote = useMemo(() => quoteFlashBounty(options), [options]);
  const totalCredits = quote.total;
  const isCustom = selectedTier.id === "standard";

  const findSpot = () => {
    setLocating(true);
    setLocateError(null);
    void readFlashSpot()
      .then((nextSpot) => {
        setSpot(nextSpot);
        setLocationQuery(nextSpot.formatted);
      })
      .catch(() => setLocateError("Allow location access so onlookers know where to come."))
      .finally(() => setLocating(false));
  };

  const loadBalance = () => {
    setBalanceLoading(true);
    void readWalletBalance()
      .then(setBalance)
      .catch(() => setBalance(null))
      .finally(() => setBalanceLoading(false));
  };

  useEffect(() => {
    if (!open) return;
    findSpot();
    void isSignedIn().then(setSignedIn);
    loadBalance();
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
            ? "Still finding your exact spot, hang on a moment."
            : "We couldn't pin your location. Tap Retry above."),
      );
      return;
    }
    if (balance === null && balanceLoading) {
      toast.error("We're still loading your Credit balance, try again in a moment.");
      return;
    }
    if (isCustom && customError) {
      toast.error(customError);
      return;
    }
    if (balance !== null && short) {
      toast.error(
        `Not enough Credits, this flash bounty locks ${formatCredits(
          totalCredits,
        )} and you have ${formatCredits(Math.round(balance))}. Buy credits to go live here.`,
      );
      return;
    }
    if (!human.ready) {
      toast.error("Finish the quick human check before going live.");
      return;
    }
    if (!(await phoneGate.ensureVerified(() => void post()))) return;
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
        note: `Live now, ${FLASH_DURATION_MINUTES} minute stream from this exact spot.`,
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

  return (

    <>
      {variant === "map" ? (
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label="Flash bounty, something is happening here now"
          title="Instantly alerts nearby onlookers to go live at this exact spot."
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
          aria-label="Flash bounty, something is happening here now"
          title="Instantly alerts nearby onlookers to go live at this exact spot."
          className="group flex h-full w-full min-w-0 flex-col items-center justify-start gap-1 px-0.5 py-3 text-center text-[0.55rem] font-bold leading-tight text-signal"
        >
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-signal text-signal-foreground">
            <Zap className="size-5" strokeWidth={2.25} />
          </span>
          <span className="w-full truncate">Flash</span>
        </button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="border-border bg-surface sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-display text-2xl">
              <Zap className="size-6 text-signal" /> Happening here now
            </DialogTitle>
            <DialogDescription>
              Instantly alerts nearby onlookers to go live at this exact spot.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
              <label className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                <MapPin className="size-4 shrink-0 text-signal" /> Location
              </label>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1">
                  <PlaceSearchInput
                    value={locationQuery}
                    placeholder={locating ? "Finding your exact spot…" : "Search an address or landmark"}
                    onQueryChange={(query) => {
                      setLocationQuery(query);
                      if (query.trim() !== spot?.formatted.trim()) {
                        setSpot(null);
                        setLocateError(
                          query.trim()
                            ? "Choose a matching place from the suggestions or press Enter to search."
                            : "Enter an address, landmark, or location name.",
                        );
                      }
                    }}
                    onPick={(place) => {
                      setSpot({
                        latitude: place.latitude,
                        longitude: place.longitude,
                        formatted: place.formatted,
                      });
                      setLocationQuery(place.formatted);
                      setLocateError(null);
                    }}
                  />
                </div>
                <Button
                  type="button"
                  onClick={findSpot}
                  disabled={locating}
                  className="h-11 shrink-0 gap-1.5 bg-signal px-3 text-xs font-extrabold leading-tight text-signal-foreground"
                >
                  <LocateFixed className={cn("size-4", locating && "animate-pulse")} />
                  {locating ? "Locating…" : "Use My Current Location"}
                </Button>
              </div>

              <div className="pt-1">
                <LocationPreviewMap
                  compact
                  address={locationQuery}
                  selectedLocation={spot}
                  onPick={(place) => {
                    setSpot({
                      latitude: place.latitude,
                      longitude: place.longitude,
                      formatted: place.formatted,
                    });
                    setLocationQuery(place.formatted);
                    setLocateError(null);
                  }}
                />
              </div>
              {locateError && (
                <div className="mt-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-destructive">{locateError}</span>
                  <Button type="button" size="sm" variant="outline" onClick={findSpot}>
                    Retry
                  </Button>
                </div>
              )}
              {!locateError && spot && (
                <p className="text-xs font-medium text-signal">Location ready</p>
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

            <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                  Select optional conditions
                </p>
                <span className="font-display text-sm font-extrabold tabular-nums text-signal">
                  +{flashConditionsCredits(conditionIds).toLocaleString()} Credits
                </span>
              </div>
              <div className="space-y-2">
                {FLASH_CONDITIONS.map((condition) => {
                  const checked = conditionIds.includes(condition.id);
                  return (
                    <label
                      key={condition.id}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-xl border-2 p-2.5 transition-colors",
                        checked
                          ? "border-signal bg-signal/10"
                          : "border-border bg-surface hover:border-signal/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleCondition(condition.id)}
                        className="size-4 shrink-0 accent-signal"
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-extrabold text-foreground">
                          {condition.label}
                        </span>
                        <span className="block text-[0.65rem] font-medium text-muted-foreground">
                          {condition.blurb}
                        </span>
                      </span>
                      <span className="shrink-0 font-display text-sm font-extrabold tabular-nums text-signal">
                        +{condition.credits}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            <ul className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <li className="flex items-center gap-2">
                <Radar className="size-3.5 shrink-0 text-signal" />
                <span>
                  <span className="font-bold text-foreground">Priority Broadcast:</span> Pushed to nearby onlookers first
                </span>
              </li>
              <li className="flex items-center gap-2">
                <Timer className="size-3.5 shrink-0 text-signal" />
                <span>
                  <span className="font-bold text-foreground">Window:</span> {FLASH_DURATION_MINUTES}-minute live stream, expires in {FLASH_WINDOW_MINUTES} minutes
                </span>
              </li>
            </ul>

            <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-extrabold text-foreground">Your balance</span>
                {balance !== null ? (
                  <span className={cn(
                    "font-display text-lg font-extrabold tabular-nums",
                    short ? "text-destructive" : "text-signal",
                  )}>
                    {formatCredits(Math.round(balance))}
                  </span>
                ) : balanceLoading ? (
                  <span className="text-sm font-bold text-muted-foreground">Loading…</span>
                ) : signedIn === false ? (
                  <span className="text-sm font-bold text-muted-foreground">Sign in to see it</span>
                ) : (
                  <button
                    type="button"
                    onClick={loadBalance}
                    className="text-sm font-bold text-signal underline"
                  >
                    Couldn't load, retry
                  </button>
                )}
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
              disabled={posting}
              className="h-12 w-full bg-signal font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
            >
              {posting ? "Broadcasting…" : `Go live here, lock ${formatCredits(totalCredits)}`}
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
      {phoneGate.gate}
    </>
  );
}
