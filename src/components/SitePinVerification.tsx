import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Copy, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { readSitePinState, verifySitePin, type SitePinState } from "@/lib/site-pin";

/**
 * Three-step on-site handshake for real estate bounties:
 * the poster sees a unique 6-digit PIN, the agent standing at the property
 * reads it out, and the onlooker types it here. A match stamps the bounty
 * "Verified on site" and unlocks footage submission and payout, so nobody can
 * file from their couch.
 */
export function SitePinVerification({
  requestId,
  onVerified,
}: {
  /** Database id of the posted request. */
  requestId: string | null | undefined;
  onVerified?: (state: SitePinState) => void;
}) {
  const [state, setState] = useState<SitePinState | null>(null);
  const [digits, setDigits] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!requestId) return;
    const next = await readSitePinState(requestId);
    setState(next);
    if (next.verified) onVerified?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!requestId || !state?.required) return null;

  async function submit() {
    if (!requestId || digits.length !== 6) return;
    setChecking(true);
    setError("");
    try {
      const result = await verifySitePin(requestId, digits);
      if (result.verified) {
        toast.success("Verified on site. Payout unlocked for this bounty.");
        setDigits("");
        await load();
      } else {
        setError(
          result.attemptsLeft > 0
            ? `That PIN doesn't match. ${result.attemptsLeft} ${result.attemptsLeft === 1 ? "try" : "tries"} left before a 15 minute lockout.`
            : "That PIN doesn't match and you're out of tries for now. Ask the on-site agent and try again in 15 minutes.",
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check that PIN.");
    } finally {
      setChecking(false);
    }
  }

  if (state.verified) {
    return (
      <div className="mt-3 rounded-xl border border-signal/50 bg-signal/10 p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-signal">
          <BadgeCheck className="size-4" /> Verified on site
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {state.verifiedAt ? `Confirmed ${new Date(state.verifiedAt).toLocaleString()}. ` : ""}
          {state.mine
            ? "An onlooker matched your PIN with the agent at the property."
            : "Your footage and payout for this bounty are unlocked."}
        </p>
      </div>
    );
  }

  // Step 1: the poster sees the PIN to hand to the on-site agent.
  if (state.mine) {
    return (
      <div className="mt-3 rounded-xl border border-signal/40 bg-signal/5 p-3">
        <div className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-signal">
          <KeyRound className="size-3.5" /> On-site verification PIN
        </div>
        <div className="mt-2 flex items-center gap-2">
          <span className="font-display text-3xl tracking-[0.35em] text-foreground">
            {state.pin ?? "······"}
          </span>
          {state.pin && (
            <button
              type="button"
              aria-label="Copy PIN"
              onClick={() => {
                void navigator.clipboard?.writeText(state.pin ?? "");
                toast.success("PIN copied.");
              }}
              className="grid size-9 place-items-center rounded-full border border-border bg-secondary/80 text-foreground"
            >
              <Copy className="size-4" />
            </button>
          )}
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          Give this PIN only to the seller, listing agent or property manager who will be on site.
          The onlooker has to enter it at the property before any footage or payout goes through.
        </p>
      </div>
    );
  }

  // Steps 2 and 3: the onlooker asks the agent and enters the PIN here.
  return (
    <div className="mt-3 rounded-xl border border-signal/40 bg-surface p-3">
      <div className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-signal">
        <ShieldCheck className="size-3.5" /> Verify on site
      </div>
      <p className="mt-1.5 text-xs text-muted-foreground">
        Ask the agent at the property for the 6-digit Onlooker Live PIN, then enter it to unlock
        filming and payout for this bounty.
      </p>
      <input
        value={digits}
        onChange={(event) => {
          setDigits(event.target.value.replace(/\D/g, "").slice(0, 6));
          setError("");
        }}
        inputMode="numeric"
        autoComplete="one-time-code"
        aria-label="6-digit on-site PIN"
        placeholder="••••••"
        className="mt-3 w-full rounded-xl border border-border bg-surface-raised px-4 py-3 text-center font-display text-2xl tracking-[0.35em] text-foreground outline-none focus:border-signal"
      />
      {error && (
        <p aria-live="polite" className="mt-2 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
      <button
        type="button"
        disabled={digits.length !== 6 || checking}
        onClick={() => void submit()}
        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
      >
        {checking ? (
          <>
            <Loader2 className="size-3.5 animate-spin" /> Checking…
          </>
        ) : (
          "Verify bounty submission"
        )}
      </button>
    </div>
  );
}
