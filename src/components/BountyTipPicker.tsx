import { CoinsIcon } from "lucide-react";
import { formatCreditCash, formatCredits } from "@/lib/credits";
import { cn } from "@/lib/utils";

const TIPS = [0, 4, 8, 20];

/**
 * Optional Bounty Wallet tip added on top of the escrowed reward, used to
 * nudge nearby onlookers to walk over sooner.
 */
export function BountyTipPicker({
  value,
  onChange,
  balance,
  total,
}: {
  value: number;
  onChange: (v: number) => void;
  balance?: number | null;
  total: number;
}) {
  const custom = !TIPS.includes(value);
  const shortFall = balance != null && total > balance;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {TIPS.map((amount) => {
          const on = value === amount;
          return (
            <button
              key={amount}
              type="button"
              onClick={() => onChange(amount)}
              aria-pressed={on}
              className={cn(
                "rounded-2xl border-2 py-3 text-center font-display text-lg font-extrabold tabular-nums transition-all",
                on
                  ? "border-signal bg-signal text-signal-foreground"
                  : "border-border bg-surface-raised text-foreground hover:border-signal/60",
              )}
            >
              <span className="block">{amount === 0 ? "None" : `+${amount}`}</span>
              {amount > 0 && (
                <span className="mt-0.5 block text-[0.6rem] font-bold opacity-70">
                  {formatCreditCash(amount)}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div
        className={cn(
          "flex items-center gap-2 rounded-2xl border-2 bg-surface-raised px-3 py-2.5",
          custom ? "border-signal" : "border-border",
        )}
      >
        <CoinsIcon className="size-5 shrink-0 text-signal" strokeWidth={2.5} />
        <input
          type="number"
          inputMode="decimal"
          min={0}
          step="1"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Math.max(0, Math.round(Number(e.target.value) || 0)))}
          placeholder="Custom tip in credits"
          className="w-full bg-transparent font-display text-xl font-extrabold tabular-nums outline-none"
          aria-label="Custom tip amount"
        />
      </div>

      <p className="flex items-start gap-2 text-xs font-medium text-foreground/75">
        <CoinsIcon className="mt-0.5 size-4 shrink-0 text-signal" />
        <span>
          Optional tip in Looker Credits from your wallet. It rides along with the reward, shows as
          a higher payout on the map, and is refunded with the bounty if nobody claims it.
          {value > 0 && (
            <span className="mt-1 block font-extrabold text-signal">
              Total held: {formatCredits(total)} · {formatCreditCash(total)}
            </span>
          )}
          {shortFall && (
            <span className="mt-1 block font-extrabold text-live">
              Your wallet has {formatCredits(balance ?? 0)} — lower the tip or buy credits.
            </span>
          )}
        </span>
      </p>
    </div>
  );
}
