import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Banknote, CoinsIcon, ExternalLink, Landmark, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { fetchCreditWallet } from "@/lib/credits";
import {
  CREDITS_PER_USD,
  MIN_CASHOUT_CREDITS,
  PAYOUT_STATUS_LABELS,
  creditsToUsd,
  listCreditPayouts,
  requestCreditCashout,
  type PayoutRequestRow,
} from "@/lib/credit-cashout";
import {
  getPayoutStatus,
  openPayoutAccount,
  startPayoutOnboarding,
} from "@/lib/payouts.functions";

/** Marker substring of the "Connect not enabled on this payments account" message. */
const CONNECT_UNSUPPORTED_MARK = "Direct bank cash-outs";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-signal/15 text-signal",
  processing: "bg-signal/15 text-signal",
  completed: "bg-live/15 text-live",
  paid: "bg-live/15 text-live",
  failed: "bg-urgent/15 text-urgent",
};

/** Payout Dashboard: turn earned Credits into real money in the bank. */
export function CreditPayoutDashboard() {
  const loadStatus = useServerFn(getPayoutStatus);
  const beginOnboarding = useServerFn(startPayoutOnboarding);
  const openConnectedAccount = useServerFn(openPayoutAccount);

  const [credits, setCredits] = useState<number | null>(null);
  const [bank, setBank] = useState<{ connected: boolean; payoutsEnabled: boolean } | null>(null);
  const [payouts, setPayouts] = useState<PayoutRequestRow[]>([]);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [connectNote, setConnectNote] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    try {
      const wallet = await fetchCreditWallet();
      setCredits(wallet?.creditBalance ?? null);
      if (!wallet) return;
      setPayouts(await listCreditPayouts());
      try {
        const status = await loadStatus();
        setBank({ connected: status.connected, payoutsEnabled: status.payoutsEnabled });
        if (status.supported === false && status.error) setConnectNote(status.error);
      } catch {
        setBank({ connected: false, payoutsEnabled: false });
      }
    } catch (error) {
      console.error("[payouts] refresh failed", error);
    }
  }, [loadStatus]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function connectBank() {
    setBusy(true);
    try {
      const result = await beginOnboarding();
      if (result.error || !result.url) throw new Error(result.error ?? "Could not open bank setup");
      const opened = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        if (window.top && window.top !== window.self) window.top.location.href = result.url;
        else window.location.href = result.url;
      }
      toast.info("Bank setup opened in a new tab. Come back here when you're done.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not open bank setup";
      if (message.includes(CONNECT_UNSUPPORTED_MARK)) setConnectNote(message);
      else toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  async function openAccount() {
    setBusy(true);
    try {
      const result = await openConnectedAccount();
      if (result.error || !result.url)
        throw new Error(result.error ?? "Could not open your payout account");
      const opened = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!opened) {
        if (window.top && window.top !== window.self) window.top.location.href = result.url;
        else window.location.href = result.url;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open your payout account");
    } finally {
      setBusy(false);
    }
  }

  async function cashOutCredits() {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value < MIN_CASHOUT_CREDITS) {
      toast.error(`Minimum cash out is ${MIN_CASHOUT_CREDITS} Credits ($10.00)`);
      return;
    }
    if (credits !== null && value > credits) {
      toast.error("Insufficient Credits");
      return;
    }
    setBusy(true);
    try {
      await requestCreditCashout(value);
      toast.success(`Cash out requested — $${creditsToUsd(value).toFixed(2)} is on the way.`);
      setAmount("");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Cash out failed");
    } finally {
      setBusy(false);
    }
  }

  if (credits === null) return null;

  const canCashOut = credits >= MIN_CASHOUT_CREDITS;

  return (
    <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
      <div className="flex items-center justify-between">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Payout dashboard
        </span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Banknote className="size-3.5 text-live" />
          {bank?.payoutsEnabled ? "Bank connected" : "No bank yet"}
        </span>
      </div>

      <div className="mt-2 flex items-end gap-3">
        <span className="flex items-center gap-2 font-display text-4xl text-foreground">
          <CoinsIcon className="size-6 text-live" />
          {credits}
        </span>
        <span className="pb-1 text-sm font-semibold text-muted-foreground">
          ≈ ${creditsToUsd(credits).toFixed(2)} cash
        </span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {CREDITS_PER_USD} Credits = $1.00 USD. Cash out from {MIN_CASHOUT_CREDITS} credits ($10.00).
      </p>

      {bank?.payoutsEnabled ? (
        <>
          <div className="mt-4 flex gap-2">
            <input
              inputMode="numeric"
              value={amount}
              onChange={(event) => setAmount(event.target.value.replace(/[^0-9]/g, ""))}
              placeholder={`Credits (min ${MIN_CASHOUT_CREDITS})`}
              className="min-w-0 flex-1 rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-live"
            />
          </div>
          {amount && Number(amount) >= MIN_CASHOUT_CREDITS && (
            <p className="mt-2 text-xs font-semibold text-live">
              You&apos;ll receive ${creditsToUsd(Number(amount)).toFixed(2)} in your bank.
            </p>
          )}
          <button
            type="button"
            onClick={() => void cashOutCredits()}
            disabled={busy}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-live font-display text-base font-extrabold uppercase tracking-[0.1em] text-black disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Landmark className="size-5" />}
            Cash out via Stripe Connect
          </button>
          <p className="mt-2 text-xs text-muted-foreground">
            Transfers land in your connected bank account within 48 hours. Minimum{" "}
            {MIN_CASHOUT_CREDITS} Credits ($10.00).
          </p>
          {!canCashOut && (
            <p className="mt-2 text-xs text-urgent">
              Earn {MIN_CASHOUT_CREDITS - credits} more credits to unlock your first cash out.
            </p>
          )}
          <button
            type="button"
            onClick={() => void openAccount()}
            disabled={busy}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-60"
          >
            <ExternalLink className="size-4" /> Open my payout account
          </button>
        </>
      ) : (
        <div className="mt-4">
          {connectNote && (
            <div className="mb-3 flex items-start gap-2.5 rounded-xl border border-signal/40 bg-signal/10 px-3 py-3">
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-signal" />
              <div>
                <p className="text-xs font-semibold leading-snug text-foreground">{connectNote}</p>
                <p className="mt-1 text-[0.68rem] leading-snug text-muted-foreground">
                  Your earnings are safe — use the <span className="font-semibold text-signal">Request payout</span> button in
                  your Earnings Wallet above and we&apos;ll handle the transfer for you.
                </p>
              </div>
            </div>
          )}
          {!connectNote && (
            <>
              <button
                type="button"
                onClick={() => void connectBank()}
                disabled={busy}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-live px-4 py-3 text-sm font-bold text-black disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <Landmark className="size-4" />}
                {bank?.connected ? "Finish Stripe Connect setup" : "Onboard with Stripe Connect"}
              </button>
              <p className="mt-2 text-xs text-muted-foreground">
                Link your bank once and every future cash out is paid out automatically.
              </p>
            </>
          )}
        </div>
      )}

      <div className="mt-5 border-t border-border pt-3">
        <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
          Payout history
        </span>
        {payouts.length === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
            No transfers yet. Every cash out shows here with its amount, status and exact time.
          </p>
        ) : (
          <ul className="mt-3 space-y-2">
            {payouts.map((payout) => (
              <li
                key={payout.id}
                className="rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-semibold text-foreground">
                    ${payout.cashAmountUsd.toFixed(2)}
                  </span>
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-[0.1em] ${
                      STATUS_STYLES[payout.status] ?? "bg-surface text-muted-foreground"
                    }`}
                  >
                    {PAYOUT_STATUS_LABELS[payout.status] ?? payout.status}
                  </span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {payout.creditsRedeemed} Credits ·{" "}
                  {new Date(payout.createdAt).toLocaleString(undefined, {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </p>
                <p className="mt-0.5 text-[0.65rem] text-muted-foreground">
                  {payout.stripeTransferId
                    ? `Transfer ${payout.stripeTransferId}`
                    : payout.status === "failed"
                      ? "Money returned to your wallet"
                      : "Arrives in your bank within 48 hours"}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
