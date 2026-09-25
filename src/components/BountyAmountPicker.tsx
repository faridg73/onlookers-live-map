// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { CoinsIcon, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MIN_BOUNTY } from "@/lib/bounty-escrow";
import { formatCreditCash, formatCreditWords, formatCredits } from "@/lib/credits";
import { cn } from "@/lib/utils";

const PRESETS = [40, 80, 100, 150];

/** How much the +/- buttons move the custom amount. */
const STEP = 5;

/** Preset bounty chips plus one tidy custom amount box with a minimum. */
export function BountyAmountPicker({
  value,
  onChange,
  balance,
  min = MIN_BOUNTY,
  onBuyCredits,
}: {
  value: number;
  onChange: (v: number) => void;
  balance?: number | null;
  /** Payout floor — the reward can never settle below this. */
  min?: number;
  /** Opens an in-place wallet refill without leaving the current task. */
  onBuyCredits?: () => void;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const custom = !PRESETS.includes(safe);
  const tooLow = safe < min;
  const shortFall = balance != null && safe > balance;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map((amount) => {
          const on = safe === amount;
          const belowFloor = amount < min;
          return (
            <button
              key={amount}
              type="button"
              onClick={() => onChange(Math.max(min, amount))}
              aria-pressed={on}
              disabled={belowFloor}
              className={cn(
                "rounded-xl border px-1 py-2.5 text-center transition-colors",
              on
                  ? "border-signal bg-signal text-signal-foreground"
                  : "border-border bg-surface-raised text-foreground hover:border-signal/60",
              belowFloor && "cursor-not-allowed opacity-35 hover:border-border",
              )}
            >
              <span className="block font-display text-lg font-extrabold leading-none tabular-nums">
                {amount}
              </span>
              <span className="mt-1 block text-[0.55rem] font-bold uppercase tracking-[0.1em] opacity-70">
                Credits
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "rounded-xl border px-3 py-2.5",
          custom ? "border-signal bg-surface-raised" : "border-border bg-surface-raised",
        )}
      >
        <p className="text-[0.6rem] font-bold uppercase tracking-[0.1em] text-muted-foreground">
          Custom amount
        </p>
        <div className="mt-2 flex items-center gap-2">
          <button
            type="button"
            onClick={() => onChange(Math.max(min, safe - STEP))}
            aria-label="Lower the bounty"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground"
          >
            <Minus className="size-4" />
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <CoinsIcon className="size-4 shrink-0 text-signal" strokeWidth={2.5} />
            <input
              type="number"
              inputMode="numeric"
              min={min}
              step="1"
              value={Number.isFinite(value) ? value : ""}
              onChange={(e) => onChange(Number(e.target.value))}
              onBlur={() => {
                // A custom amount can never settle below the payout floor.
                if (!Number.isFinite(value) || value < min) onChange(min);
              }}
              placeholder={`Min ${min}`}
              className="w-full bg-transparent font-display text-lg font-bold tabular-nums text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
              aria-label="Custom bounty amount in credits"
            />
          </div>
          <button
            type="button"
            onClick={() => onChange(safe + STEP)}
            aria-label="Raise the bounty"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-border text-foreground"
          >
            <Plus className="size-4" />
          </button>
        </div>
      </div>

      {tooLow && (
        <p className="text-xs font-bold text-destructive">
          {min > MIN_BOUNTY
            ? `This request's calculated minimum is ${formatCreditWords(min)} — you can only go above it.`
            : `Bounties start at ${formatCreditWords(MIN_BOUNTY)}.`}
        </p>
      )}
      {!tooLow && shortFall && (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2">
          <p className="min-w-0 text-xs font-bold tabular-nums text-destructive">
            Your wallet has {formatCredits(balance ?? 0)}. Add credits before locking{" "}
            {formatCredits(safe)}.
          </p>
          {onBuyCredits ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onBuyCredits}
              className="min-h-12 shrink-0 rounded-full border-signal px-3 font-extrabold text-signal"
            >
              <Plus className="size-4" /> Add credits
            </Button>
          ) : null}
        </div>
      )}
      {!tooLow && !shortFall && (
        <p className="text-xs font-medium tabular-nums text-foreground">
          {formatCredits(safe)} ({formatCreditCash(safe)} value) is held from your credit wallet
          until the request is fulfilled, cancelled, or expires.
          {balance != null && ` Balance: ${formatCredits(balance)}.`}
        </p>
      )}
    </div>
  );
}
