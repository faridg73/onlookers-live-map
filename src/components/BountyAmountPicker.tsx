import { CoinsIcon, Flame, Zap } from "lucide-react";
import { MIN_BOUNTY } from "@/lib/bounty-escrow";
import { formatCreditCash, formatCreditWords, formatCredits } from "@/lib/credits";
import { cn } from "@/lib/utils";

const PRESETS: { amount: number; tag?: string; icon?: "popular" | "fast" }[] = [
  { amount: 20 },
  { amount: 40, tag: "Popular", icon: "popular" },
  { amount: 80, tag: "Fastest", icon: "fast" },
  { amount: 160 },
];

/** Preset bounty chips plus a custom amount box with a minimum. */
export function BountyAmountPicker({
  value,
  onChange,
  balance,
}: {
  value: number;
  onChange: (v: number) => void;
  balance?: number | null;
}) {
  const custom = !PRESETS.some((p) => p.amount === value);
  const tooLow = value < MIN_BOUNTY;
  const shortFall = balance != null && value > balance;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {PRESETS.map(({ amount, tag, icon }) => {
          const on = value === amount;
          return (
            <button
              key={amount}
              type="button"
              onClick={() => onChange(amount)}
              className={cn(
                "relative rounded-2xl border-2 pb-2.5 pt-4 text-center transition-all",
                on
                  ? "border-signal bg-signal text-signal-foreground shadow-[0_10px_30px_-12px_var(--signal)]"
                  : "border-border bg-surface-raised text-foreground hover:border-signal/60",
              )}
            >
              {tag && (
                <span
                  className={cn(
                    "absolute -top-2 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-[0.12em]",
                    icon === "popular"
                      ? "bg-live text-background"
                      : "bg-foreground text-background",
                  )}
                >
                  {icon === "popular" ? (
                    <Flame className="size-2.5" strokeWidth={3} />
                  ) : (
                    <Zap className="size-2.5" strokeWidth={3} />
                  )}
                  {tag}
                </span>
              )}
              <span className="block font-display text-xl font-extrabold leading-none tabular-nums">
                {amount}
              </span>
              <span className="mt-0.5 block text-[0.55rem] font-bold uppercase tracking-[0.14em] opacity-70">
                Credits
              </span>
              <span className="mt-1 block text-[0.62rem] font-extrabold tabular-nums opacity-80">
                {formatCreditCash(amount)}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border-2 px-3 py-2.5",
          custom ? "border-signal bg-surface-raised" : "border-border bg-surface-raised",
        )}
      >
        <Credits className="size-5 shrink-0 text-signal" strokeWidth={2.5} />
        <input
          type="number"
          inputMode="decimal"
          min={MIN_BOUNTY}
          step="1"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={`Custom credits (min ${MIN_BOUNTY} Credits)`}
          className="w-full bg-transparent font-display text-lg font-bold text-foreground outline-none placeholder:font-medium placeholder:text-muted-foreground"
          aria-label="Custom bounty amount"
        />
      </div>

      {tooLow && (
        <p className="text-xs font-bold text-destructive">
          Bounties start at {formatCreditWords(MIN_BOUNTY)}.
        </p>
      )}
      {!tooLow && shortFall && (
        <p className="text-xs font-bold text-destructive">
          Your wallet has {formatCredits(balance ?? 0)} — buy credits before locking{" "}
          {formatCredits(value)}.
        </p>
      )}
      {!tooLow && !shortFall && (
        <p className="text-xs font-medium text-foreground/70">
          {formatCredits(Number.isFinite(value) ? value : 0)} ({formatCreditCash(value)} value) is held
          from your credit wallet until the request is fulfilled, cancelled, or expires.
          {balance != null && ` Balance: ${formatCredits(balance)}.`}
        </p>
      )}
    </div>
  );
}
