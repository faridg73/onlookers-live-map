import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Globe2, MapPin, Radio } from "lucide-react";
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
import { CREDITS_PER_USD, formatCreditCash, formatCredits } from "@/lib/credits";
import {
  computeRequestedViewCredits,
  DEFAULT_REQUEST_VIEW_BASE,
  DEFAULT_REQUEST_VIEW_TIER,
  DEFAULT_REQUEST_VIEW_WINDOW,
  postRequestedView,
  quoteRequestedView,
  REQUEST_VIEW_DURATION_MINUTES,
  REQUEST_VIEW_MIN_CREDITS,
  REQUEST_VIEW_TIERS,
  REQUEST_VIEW_TITLE,
  REQUEST_VIEW_WINDOWS,
  requestViewErrors,
  type ViewPin,
  type ViewTierPreset,
} from "@/lib/request-a-view";
import { useOnlooker } from "@/lib/onlooker-store";
import { cn } from "@/lib/utils";

/**
 * Funding sheet for a pin dropped anywhere in the world: name the spot, pick a
 * reward, see the exact escrow total in credits and dollars, pass the human
 * check, and lock it.
 */
export function RequestViewPinDialog({
  pin,
  naming,
  onClose,
}: {
  pin: ViewPin | null;
  /** True while the dropped coordinates are still being named. */
  naming: boolean;
  onClose: () => void;
}) {
  const { addRequest } = useOnlooker();
  const navigate = useNavigate();
  const human = useHumanCheck("request-a-view");

  const [placeName, setPlaceName] = useState("");
  const [tier, setTier] = useState<ViewTierPreset>(
    REQUEST_VIEW_TIERS.find((t) => t.id === DEFAULT_REQUEST_VIEW_TIER) ?? REQUEST_VIEW_TIERS[0]!,
  );
  const [customBase, setCustomBase] = useState(String(DEFAULT_REQUEST_VIEW_BASE));
  const [windowMinutes, setWindowMinutes] = useState<number>(DEFAULT_REQUEST_VIEW_WINDOW);
  const [balance, setBalance] = useState<number | null>(null);
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [posting, setPosting] = useState(false);
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    if (pin) setPlaceName(pin.formatted);
  }, [pin]);

  useEffect(() => {
    if (!pin) return;
    void isSignedIn().then(setSignedIn);
    void readWalletBalance().then(setBalance);
  }, [pin]);

  const options = useMemo(
    () => ({
      tierId: tier.id,
      customBase: tier.baseCredits ?? Math.max(0, Math.round(Number(customBase) || 0)),
      windowMinutes,
      placeName,
    }),
    [tier, customBase, windowMinutes, placeName],
  );

  const quote = useMemo(() => quoteRequestedView(options), [options]);
  const total = quote.total;
  const errors = requestViewErrors(options);
  const isCustom = tier.id === "standard";
  const short = balance !== null && balance < total;

  const submit = async () => {
    setTouched(true);

    if (signedIn === false) {
      onClose();
      toast.error("Sign in to fund a view", {
        description: "Your credits sit in escrow, so we need your account first.",
      });
      await navigate({ to: "/auth" });
      return;
    }
    if (!pin) {
      toast.error("Drop the pin again, we lost those coordinates.");
      return;
    }
    const firstError = errors.placeName ?? errors.customBase;
    if (firstError) {
      toast.error("Check the highlighted fields", { description: firstError });
      return;
    }
    if (balance === null) {
      toast.error("We're still loading your Credit balance, try again in a moment.");
      return;
    }
    if (short) {
      toast.error(
        `Not enough Credits, this pin locks ${formatCredits(total)} and you have ${formatCredits(
          Math.round(balance),
        )}. Buy credits to fund this view.`,
      );
      return;
    }
    if (!human.ready) {
      toast.error("Finish the quick human check before your credits are locked.");
      return;
    }

    setPosting(true);
    try {
      const locked = await postRequestedView(pin, options, human.token);
      setBalance(locked.balance);
      addRequest({
        title: REQUEST_VIEW_TITLE,
        place: placeName.trim(),
        note: `Live view wanted, ${REQUEST_VIEW_DURATION_MINUTES} minute stream from this pin.`,
        bounty: total,
        category: "events",
        dbId: locked.id,
        lat: pin.latitude,
        lng: pin.longitude,
        expiresInMin: windowMinutes,
      });
      human.reset();
      onClose();
      toast.success("Your view is funded", {
        description: `Broadcasters near ${placeName.trim()} were alerted. ${formatCredits(
          total,
        )} held in escrow for ${windowMinutes} minutes.`,
      });
    } catch (error) {
      human.reset();
      toast.error(error instanceof Error ? error.message : "Could not fund that view.");
    } finally {
      setPosting(false);
    }
  };

  return (
    <Dialog open={Boolean(pin) || naming} onOpenChange={(open) => (!open ? onClose() : undefined)}>
      <DialogContent className="max-h-[88dvh] overflow-y-auto border-border bg-surface sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display text-2xl">
            <Globe2 className="size-6 text-signal" /> Request a view
          </DialogTitle>
          <DialogDescription>
            Fund a live stream from this exact spot. Anyone standing near the pin gets a bounty
            alert straight away.
          </DialogDescription>
        </DialogHeader>

        {naming || !pin ? (
          <p className="py-8 text-center text-sm font-medium text-muted-foreground">
            Naming that spot…
          </p>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
              <p className="flex items-start gap-2 text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                <MapPin className="mt-0.5 size-3.5 shrink-0 text-signal" />
                {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
              </p>
              <Input
                id="view-place-name"
                value={placeName}
                onChange={(e) => setPlaceName(e.target.value)}
                placeholder="Name this spot"
                className={cn(
                  "h-11 rounded-xl border-2 bg-surface font-bold",
                  touched && errors.placeName
                    ? "border-destructive focus-visible:ring-destructive"
                    : "border-border",
                )}
              />
              {touched && errors.placeName && (
                <p className="text-xs font-bold text-destructive">{errors.placeName}</p>
              )}
            </div>

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                Choose reward tier
              </p>
              <div className="grid grid-cols-3 gap-2">
                {REQUEST_VIEW_TIERS.map((preset) => {
                  const active = tier.id === preset.id;
                  const amount = Math.max(0, Math.round(Number(customBase) || 0));
                  const credits =
                    preset.baseCredits ??
                    computeRequestedViewCredits({
                      tierId: preset.id,
                      customBase: amount,
                      windowMinutes,
                    });
                  const display = preset.baseCredits
                    ? credits.toLocaleString()
                    : amount >= REQUEST_VIEW_MIN_CREDITS
                      ? amount.toLocaleString()
                      : "Custom";
                  return (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => setTier(preset)}
                      className={cn(
                        "flex flex-col items-center gap-1 rounded-2xl border-2 p-3 transition-colors",
                        active
                          ? "border-signal bg-signal/10 text-foreground"
                          : "border-border bg-surface-raised text-muted-foreground hover:border-signal/50 hover:text-foreground",
                      )}
                    >
                      <span className="text-xs font-extrabold">{preset.label}</span>
                      <span className="font-display text-lg font-extrabold tabular-nums text-signal">
                        {display}
                      </span>
                      <span className="text-[0.6rem] font-medium leading-tight opacity-80">
                        {preset.blurb}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {isCustom && (
              <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
                <label
                  htmlFor="view-custom-amount"
                  className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground"
                >
                  Custom amount
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id="view-custom-amount"
                    type="number"
                    min={REQUEST_VIEW_MIN_CREDITS}
                    step={1}
                    value={customBase}
                    onChange={(e) => setCustomBase(e.target.value)}
                    placeholder={`Minimum ${REQUEST_VIEW_MIN_CREDITS}`}
                    className={cn(
                      "h-11 rounded-xl border-2 bg-surface text-right font-display text-lg font-extrabold tabular-nums",
                      errors.customBase
                        ? "border-destructive focus-visible:ring-destructive"
                        : "border-border",
                    )}
                  />
                  <span className="shrink-0 text-sm font-bold text-muted-foreground">Credits</span>
                </div>
                <p className="text-xs font-medium text-muted-foreground">
                  ≈ {formatCreditCash(Math.max(0, Math.round(Number(customBase) || 0)))} USD at{" "}
                  {CREDITS_PER_USD} Credits per $1
                </p>
                <p className="text-xs font-medium text-signal">
                  Minimum escrow: {REQUEST_VIEW_MIN_CREDITS} Credits
                </p>
                {errors.customBase && (
                  <p className="text-xs font-bold text-destructive">{errors.customBase}</p>
                )}
              </div>
            )}

            <div className="space-y-2">
              <p className="text-xs font-extrabold uppercase tracking-[0.1em] text-muted-foreground">
                How long broadcasters have
              </p>
              <div className="grid grid-cols-3 gap-2">
                {REQUEST_VIEW_WINDOWS.map((minutes) => (
                  <button
                    key={minutes}
                    type="button"
                    onClick={() => setWindowMinutes(minutes)}
                    className={cn(
                      "rounded-xl border-2 px-3 py-2 text-sm font-extrabold transition-colors",
                      windowMinutes === minutes
                        ? "border-signal bg-signal/10 text-foreground"
                        : "border-border bg-surface-raised text-muted-foreground",
                    )}
                  >
                    {minutes < 60 ? `${minutes} min` : `${minutes / 60} hr`}
                  </button>
                ))}
              </div>
            </div>

            <ul className="space-y-1.5 text-xs font-medium text-muted-foreground">
              <li className="flex items-center gap-2">
                <Radio className="size-3.5 text-signal" />
                {REQUEST_VIEW_DURATION_MINUTES}-minute live stream from the pin
              </li>
              <li className="flex items-center gap-2">
                <Radio className="size-3.5 text-signal" />
                Refunded in full to your credit balance if nobody accepts in time
              </li>
            </ul>

            <div className="space-y-2 rounded-2xl border-2 border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold text-foreground">Your balance</span>
                <span
                  className={cn(
                    "font-display text-lg font-extrabold tabular-nums",
                    short ? "text-destructive" : "text-signal",
                  )}
                >
                  {balance === null ? "…" : formatCredits(Math.round(balance))}
                </span>
              </div>
              <div className="flex items-center justify-between border-t border-border pt-2">
                <span className="text-sm font-extrabold text-foreground">Locked in escrow</span>
                <span className="font-display text-lg font-extrabold tabular-nums text-signal">
                  {formatCredits(total)} · {formatCreditCash(total)}
                </span>
              </div>
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
            </div>

            {short && balance !== null && (
              <p className="text-xs font-bold text-destructive">
                You need {formatCredits(Math.ceil(total - balance))} more to fund this view.
              </p>
            )}

            <div>{human.widget}</div>

            <Button
              type="button"
              onClick={() => void submit()}
              disabled={posting}
              className="h-12 w-full bg-signal font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
            >
              {posting ? "Locking escrow…" : `Fund this view, lock ${formatCredits(total)}`}
            </Button>
            {short && (
              <Button
                type="button"
                variant="outline"
                className="h-11 w-full font-bold"
                onClick={() => {
                  onClose();
                  void navigate({ to: "/balance" });
                }}
              >
                Buy credits
              </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
