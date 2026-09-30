// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AlertCircle, Banknote, CoinsIcon, ExternalLink, Landmark, Loader2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { fetchCreditWallet } from "@/lib/credits";
import {
  fetchCashoutBalance,
  holdLabel,
  type CashoutBalance,
} from "@/lib/cashout-balance";

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
import { getIdentityStatus, startIdentityCheck, type IdentityStatus } from "@/lib/identity.functions";
import { freezeMyAccount } from "@/lib/account-security.functions";
import { QaCreditTools } from "@/components/QaCreditTools";

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
  const loadIdentity = useServerFn(getIdentityStatus);
  const beginIdentity = useServerFn(startIdentityCheck);
  const [identity, setIdentity] = useState<IdentityStatus | null>(null);
  const [idCountry, setIdCountry] = useState("US");
  // Available / on-hold figures come from the one shared calculation, so this
  // dashboard can never disagree with the earnings breakdown or wallet boxes.
  const [hold, setHold] = useState<CashoutBalance | null>(null);

  const freezeAccount = useServerFn(freezeMyAccount);
  const [confirmFreeze, setConfirmFreeze] = useState(false);

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
      setHold(await fetchCashoutBalance());

      try {
        setIdentity(await loadIdentity());
      } catch {
        setIdentity(null);
      }
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
  }, [loadStatus, loadIdentity]);

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

  async function startIdCheck() {
    setBusy(true);
    try {
      const result = await beginIdentity({ data: { country: idCountry } });
      if (result.error || !result.url) throw new Error(result.error ?? "Could not open the ID check");
      const opened = window.open(result.url, "_blank", "noopener,noreferrer");
      if (!opened) window.location.href = result.url;
      toast.info("ID check opened in a new tab. Come back here when you're done.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not open the ID check");
    } finally {
      setBusy(false);
    }
  }

  async function freezeNow() {
    setBusy(true);
    try {
      const result = await freezeAccount();
      if (result.error) throw new Error(result.error);
      toast.success("Account frozen. Cash-outs are stopped until you pass an ID check.");
      setConfirmFreeze(false);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not freeze your account");
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
    if (hold && value > hold.availableCredits) {
      toast.error(`Only ${hold.availableCredits} Credits have cleared the security hold so far.`);
      return;

    }
    if (credits !== null && value > credits) {
      toast.error("Insufficient Credits");
      return;
    }
    setBusy(true);
    try {
      await requestCreditCashout(value);
      toast.success(`Cash out requested, $${creditsToUsd(value).toFixed(2)} is on the way.`);
      setAmount("");
      await refresh();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Cash out failed";
      toast.error(
        message.includes("ID_CHECK_REQUIRED")
          ? "Please complete the one-time ID check first."
          : message.includes("PAYOUT_COOLDOWN")
            ? "Cash-outs are paused for a short while after payout details change."
            : message.includes("ON_HOLD")
              ? `Some of these Credits are still in their ${hold?.holdDays ? `${hold.holdDays}-day ` : ""}security hold.`
              : message,
      );
    } finally {
      setBusy(false);
    }
  }

  if (credits === null) return null;

  const available = hold ? hold.availableCredits : credits;
  const canCashOut = available >= MIN_CASHOUT_CREDITS;
  const idFeeUsd =
    identity?.verified && !identity.feeCharged ? (identity.country === "US" ? 0.5 : 1.5) : 0;
  const cooldownUntil = hold?.cooldownUntil ? new Date(hold.cooldownUntil) : null;
  const coolingDown = cooldownUntil !== null && cooldownUntil.getTime() > Date.now();
  const frozen = Boolean(hold?.frozenAt) || Boolean(identity?.frozen);

  const fmtTime = (d: Date) =>
    d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });

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

      {hold && (
        <div className="mt-3 grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">Available to withdraw</p>
            <p className="mt-0.5 text-sm font-bold text-live">
              {hold.availableCredits} · ${creditsToUsd(hold.availableCredits).toFixed(2)}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-surface px-3 py-2">
            <p className="text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
              {holdLabel(hold.holdDays)}
            </p>
            <p className="mt-0.5 text-sm font-bold text-foreground">
              {hold.onHoldCredits} · ${creditsToUsd(hold.onHoldCredits).toFixed(2)}
            </p>
            {hold.nextReleaseAt && hold.onHoldCredits > 0 && (
              <p className="text-[0.62rem] text-muted-foreground">
                Next release {fmtTime(new Date(hold.nextReleaseAt))}
              </p>
            )}

          </div>
        </div>
      )}

      {frozen ? (
        <div className="mt-4 rounded-xl border border-urgent/40 bg-urgent/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="size-4 text-urgent" /> Your account is frozen
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            All cash-outs are stopped. Pass a quick ID check to unfreeze it. There&apos;s no fee for this check.
          </p>
          {identity?.pending ? (
            <p className="mt-3 text-xs font-semibold text-signal">Your ID is being reviewed. This usually takes a few minutes.</p>
          ) : (
            <>
              <select
                value={idCountry}
                onChange={(event) => setIdCountry(event.target.value)}
                className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                aria-label="Where your ID is from"
              >
                <option value="US">ID from the United States</option>
                <option value="XX">ID from another country</option>
              </select>
              <button
                type="button"
                onClick={() => void startIdCheck()}
                disabled={busy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-bold text-signal-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Verify my ID to unfreeze
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            I finished, check again
          </button>
        </div>
      ) : bank?.payoutsEnabled && identity && !identity.verified ? (
        <div className="mt-4 rounded-xl border border-signal/40 bg-signal/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-signal" /> One-time ID check before your first cash out
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            This keeps stolen accounts from draining earnings. A one-time fee of{" "}
            {idCountry === "US" ? "$0.50" : "$1.50"} comes out of your first cash out. You only do this once.
          </p>
          {identity.pending ? (
            <p className="mt-3 text-xs font-semibold text-signal">Your ID is being reviewed. This usually takes a few minutes.</p>
          ) : (
            <>
              <select
                value={idCountry}
                onChange={(event) => setIdCountry(event.target.value)}
                className="mt-3 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground"
                aria-label="Where your ID is from"
              >
                <option value="US">ID from the United States</option>
                <option value="XX">ID from another country</option>
              </select>
              <button
                type="button"
                onClick={() => void startIdCheck()}
                disabled={busy}
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-bold text-signal-foreground disabled:opacity-60"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                Verify my ID
              </button>
            </>
          )}
          <button
            type="button"
            onClick={() => void refresh()}
            className="mt-2 w-full text-center text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            I finished, check again
          </button>
        </div>
      ) : bank?.payoutsEnabled ? (
        <>
          {identity?.verified && !identity.feeCharged && (
            <p className="mt-3 text-xs text-muted-foreground">
              ID verified. A one-time {identity.country === "US" ? "$0.50" : "$1.50"} ID check fee comes out of this cash out.
            </p>
          )}
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
              You&apos;ll receive ${Math.max(creditsToUsd(Number(amount)) - idFeeUsd, 0).toFixed(2)} in your bank
              {idFeeUsd > 0 ? ` (after the one-time $${idFeeUsd.toFixed(2)} ID check fee)` : ""}.
            </p>
          )}
          <button
            type="button"
            onClick={() => void cashOutCredits()}
            disabled={busy || coolingDown}
            className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-2xl bg-signal font-display text-base font-extrabold uppercase tracking-[0.1em] text-signal-foreground disabled:opacity-60"
          >
            {busy ? <Loader2 className="size-5 animate-spin" /> : <Landmark className="size-5" />}
            Cash out via Stripe Connect
          </button>
          {coolingDown && cooldownUntil && (
            <p className="mt-2 text-xs font-semibold text-signal">
              Your payout details changed recently. For your safety, cash-outs unlock {fmtTime(cooldownUntil)}.
              {hold?.test_mode ? " (Test mode: 2-minute wait.)" : ""}
            </p>
          )}
          <p className="mt-2 text-xs text-muted-foreground">
            Transfers land in your connected bank account within 48 hours. Minimum{" "}
            {MIN_CASHOUT_CREDITS} Credits ($10.00).
          </p>
          {!canCashOut && (
            <p className="mt-2 text-xs text-urgent">
              {MIN_CASHOUT_CREDITS - available} more cleared credits needed to unlock your first cash out.
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
                  Your earnings are safe, use the <span className="font-semibold text-signal">Request payout</span> button in
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
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-sm font-bold text-signal-foreground disabled:opacity-60"
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

      {!frozen && (
        <div className="mt-4 rounded-xl border border-border bg-surface p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Lock className="size-4 text-muted-foreground" /> Freeze my account
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Think someone else got in? Freezing stops every cash-out right away. Only an ID check can unfreeze it.
          </p>
          {confirmFreeze ? (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => void freezeNow()}
                disabled={busy}
                className="flex-1 rounded-xl bg-urgent px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-foreground disabled:opacity-60"
              >
                Yes, freeze now
              </button>
              <button
                type="button"
                onClick={() => setConfirmFreeze(false)}
                className="flex-1 rounded-xl border border-border px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-muted-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmFreeze(true)}
              className="mt-3 w-full rounded-xl border border-urgent/50 px-3 py-2.5 text-xs font-bold uppercase tracking-[0.1em] text-urgent"
            >
              Freeze my account
            </button>
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

      <QaCreditTools onChanged={refresh} />
    </div>
  );
}
