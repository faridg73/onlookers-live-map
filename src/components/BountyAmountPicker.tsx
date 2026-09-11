import { MIN_BOUNTY } from "@/lib/bounty-escrow";

const PRESETS = [5, 10, 20, 40];

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
  const custom = !PRESETS.includes(value);
  const tooLow = value < MIN_BOUNTY;
  const shortFall = balance != null && value > balance;

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        {PRESETS.map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => onChange(b)}
            className={
              "flex-1 rounded-xl border py-2.5 font-display text-base transition-colors " +
              (value === b
                ? "border-signal bg-signal text-signal-foreground"
                : "border-border bg-surface-raised text-muted-foreground hover:border-signal/50")
            }
          >
            ${b}
          </button>
        ))}
      </div>

      <div
        className={
          "flex items-center gap-2 rounded-xl border px-3 py-2 " +
          (custom ? "border-signal/60 bg-surface-raised" : "border-border bg-surface-raised")
        }
      >
        <span className="font-display text-lg text-muted-foreground">$</span>
        <input
          type="number"
          inputMode="decimal"
          min={MIN_BOUNTY}
          step="1"
          value={Number.isFinite(value) ? value : ""}
          onChange={(e) => onChange(Number(e.target.value))}
          placeholder={`Custom amount (min $${MIN_BOUNTY})`}
          className="w-full bg-transparent font-display text-lg text-foreground outline-none"
          aria-label="Custom bounty amount"
        />
      </div>

      {tooLow && (
        <p className="text-xs text-destructive">Bounties start at ${MIN_BOUNTY}.</p>
      )}
      {!tooLow && shortFall && (
        <p className="text-xs text-destructive">
          Your wallet has ${balance?.toFixed(2)} — top up before locking ${value}.
        </p>
      )}
      {!tooLow && !shortFall && (
        <p className="text-xs text-muted-foreground">
          ${Number.isFinite(value) ? value : 0} is held from your wallet until the request is
          fulfilled, cancelled, or expires.
          {balance != null && ` Balance: $${balance.toFixed(2)}.`}
        </p>
      )}
    </div>
  );
}
