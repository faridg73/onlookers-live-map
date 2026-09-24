// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { BadgeCheck, Copy, KeyRound, Loader2, MapPin, Send, ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";
import { toast } from "sonner";

import { checkInOnSite, resendSitePin } from "@/lib/site-pin.functions";
import { supabase } from "@/integrations/supabase/client";

type Approval = {
  checked_in_at?: string | null;
  checked_in_by_me?: boolean;
  link_active?: boolean;
  denied?: boolean;
  denied_for_me?: boolean;
  approved_via?: string | null;
};
import { readSitePinState, reportAgentUnreachable, verifySitePin, type SitePinState } from "@/lib/site-pin";

/**
 * Three-step on-site handshake for real estate bounties:
 * the poster sees a unique 6-digit PIN, the agent standing at the property
 * reads it out, and the onlooker types it here. A match stamps the bounty
 * "Verified on site" and unlocks footage submission and payout, so nobody can
 * file from their couch.
 *
 * The PIN is single use and expires two hours after the bounty's deadline. When
 * it never reaches the agent, either side can resend it; when the agent never
 * shows, the onlooker can report it and still be paid for the trip.
 */
export function SitePinVerification({
  requestId,
  onState,
}: {
  /** Database id of the posted request. */
  requestId: string | null | undefined;
  /** Fires whenever the handshake state is loaded or changes. */
  onState?: (state: SitePinState) => void;
}) {
  const [state, setState] = useState<SitePinState | null>(null);
  const [digits, setDigits] = useState("");
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState("");
  const [resending, setResending] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportNote, setReportNote] = useState("");
  const [reporting, setReporting] = useState(false);
  const resend = useServerFn(resendSitePin);
  const checkIn = useServerFn(checkInOnSite);
  const [approval, setApproval] = useState<Approval>({});
  const [checkingIn, setCheckingIn] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const prevVerified = useRef(false);
  const waitingSeen = useRef(false);

  const load = useCallback(async () => {
    if (!requestId) return;
    const [next, appr] = await Promise.all([
      readSitePinState(requestId),
      supabase.rpc("site_approval_state", { _request_id: requestId }),
    ]);
    setApproval((appr.data ?? {}) as Approval);
    setState(next);
    onState?.(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Live status: while a check-in is waiting on the contact, refresh every 4s.
  const waiting = Boolean(state?.required && !state.verified && !state.declined && approval.link_active);
  useEffect(() => {
    if (!waiting) return;
    const id = window.setInterval(() => void load(), 4000);
    return () => window.clearInterval(id);
  }, [waiting, load]);

  useEffect(() => {
    if (state?.verified && !prevVerified.current && waitingSeen.current && approval.approved_via === "link") {
      toast.success("The property contact approved you. Filming and payout are unlocked.");
    }
    if (waiting) waitingSeen.current = true;
    prevVerified.current = Boolean(state?.verified);
  }, [state?.verified, approval.approved_via, waiting]);

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

  async function triggerCheckIn() {
    if (!requestId) return;
    setCheckingIn(true);
    try {
      const r = await checkIn({ data: { requestId } });
      const channels = [r.sms ? "text" : null, r.email ? "email" : null].filter(Boolean);
      toast.success(`Approval link sent to the property contact by ${channels.join(" and ")}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send the approval link.");
    } finally {
      setCheckingIn(false);
    }
  }

  async function triggerResend() {
    if (!requestId) return;
    setResending(true);
    try {
      const result = await resend({ data: { requestId } });
      const channels = [result.sms ? "text" : null, result.email ? "email" : null].filter(Boolean);
      toast.success(`PIN sent again to the property contact by ${channels.join(" and ")}.`);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't resend the PIN.");
    } finally {
      setResending(false);
    }
  }

  async function submitUnreachable() {
    if (!requestId || reportNote.trim().length < 10) return;
    setReporting(true);
    try {
      await reportAgentUnreachable(requestId, reportNote);
      toast.success("Reported. The bounty money is held and our team will settle your trip fee.");
      setReportOpen(false);
      setReportNote("");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't file that report.");
    } finally {
      setReporting(false);
    }
  }

  const expiryLine = state.expiresAt
    ? `PIN expires ${new Date(state.expiresAt).toLocaleString()} and works only once.`
    : "The PIN works only once.";

  const resendButton = state.canResend && (state.agentPhoneSet || state.agentEmailSet) ? (
    <button
      type="button"
      disabled={resending}
      onClick={() => void triggerResend()}
      className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground disabled:opacity-50"
    >
      {resending ? <Loader2 className="size-3.5 animate-spin" /> : <Send className="size-3.5" />}
      {resending ? "Sending…" : "Resend PIN to the contact"}
    </button>
  ) : null;

  // The property contact said the visit was never authorized.
  if (state.declined) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ShieldX className="size-4" /> Not authorized by the property contact
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          {state.declinedAt ? `Reported ${new Date(state.declinedAt).toLocaleString()}. ` : ""}
          This bounty is cancelled and the PIN no longer works. The poster&apos;s money was returned,
          and the onlooker who had already travelled is paid a trip fee.
          {state.declineNote ? ` They added: “${state.declineNote}”` : ""}
        </p>
      </div>
    );
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
            ? approval.approved_via === "link"
              ? "The property contact approved the onlooker on site."
              : "An onlooker matched your PIN with the agent at the property. The PIN is now used up."
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
          No account is needed on their side — it arrives by text or email.
        </p>
        <p className="mt-1.5 text-xs text-muted-foreground">
          {expiryLine}
          {state.sendCount > 1 ? ` Sent ${state.sendCount} times.` : ""}
          {state.expired ? " It has expired — resend a fresh delivery if the visit is still on." : ""}
        </p>
        {approval.link_active && (
          <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-signal">
            <Loader2 className="size-3.5 animate-spin" /> Onlooker checked in — waiting for the contact to approve.
          </p>
        )}
        {approval.denied && (
          <p className="mt-2 text-xs font-medium text-foreground">
            The contact said the checked-in onlooker wasn&apos;t the right person. It&apos;s with our review team.
          </p>
        )}
        {resendButton}
      </div>
    );
  }

  if (approval.denied_for_me) {
    return (
      <div className="mt-3 rounded-xl border border-border bg-surface p-3">
        <p className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
          <ShieldX className="size-4" /> Not approved by the property contact
        </p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
          The contact said you weren&apos;t the right person. You can&apos;t verify this visit, and our review
          team will look into it. The bounty money stays on hold meanwhile.
        </p>
      </div>
    );
  }

  // Not claimed yet: guide them to claim before anything else.
  if (!state.isSpotter) {
    return (
      <div className="mt-3 rounded-xl border border-signal/40 bg-surface p-3">
        <div className="flex items-center gap-1.5 text-[0.6rem] uppercase tracking-[0.16em] text-signal">
          <ShieldCheck className="size-3.5" /> On-site approval
        </div>
        <p className="mt-1.5 text-xs text-muted-foreground">
          Claim this bounty first. Once it&apos;s yours and you arrive, tap &ldquo;I&apos;m on site&rdquo; so the
          property contact can approve you, then you can film.
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
      {approval.link_active && approval.checked_in_by_me ? (
        <div className="mt-2 rounded-lg border border-signal/40 bg-signal/5 p-3" aria-live="polite">
          <p className="flex items-center gap-1.5 text-sm font-semibold text-signal">
            <Loader2 className="size-4 animate-spin" /> Waiting for the contact to approve…
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            We sent them a link with your name and photo. This screen updates by itself the moment they tap
            Approve.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-1.5 text-xs text-muted-foreground">
            When you arrive, tap below. The property contact gets a link with your name and photo and
            approves you with one tap — that unlocks filming and payout.
          </p>
          <button
            type="button"
            disabled={checkingIn}
            onClick={() => void triggerCheckIn()}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
          >
            {checkingIn ? <Loader2 className="size-3.5 animate-spin" /> : <MapPin className="size-3.5" />}
            {checkingIn ? "Sending…" : "I'm on site — request approval"}
          </button>
        </>
      )}
      <button
        type="button"
        onClick={() => setShowPin((v) => !v)}
        className="mt-3 w-full text-center text-xs font-semibold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        {showPin ? "Hide PIN entry" : "Contact can't open the link? Enter their 6-digit PIN instead"}
      </button>
      {showPin && (<>
      <p className="mt-2 text-xs text-muted-foreground">
        Ask the contact for their 6-digit Onlooker PIN (in person or by phone) and enter it here. {expiryLine}
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
          "Verify with PIN"
        )}
      </button>
      </>)}

      {resendButton}

      {state.isSpotter && (
        <div className="mt-3 border-t border-border pt-3">
          {reportOpen ? (
            <>
              <p className="text-xs font-semibold text-foreground">No PIN after waiting on site?</p>
              <textarea
                value={reportNote}
                onChange={(event) => setReportNote(event.target.value.slice(0, 1000))}
                rows={3}
                placeholder="What happened? e.g. waited 25 minutes at the gate, called twice, no answer."
                className="mt-2 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-xs text-foreground outline-none focus:border-signal"
              />
              <div className="mt-2 flex gap-2">
                <button
                  type="button"
                  disabled={reportNote.trim().length < 10 || reporting}
                  onClick={() => void submitUnreachable()}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-foreground disabled:opacity-50"
                >
                  {reporting ? <Loader2 className="size-3.5 animate-spin" /> : <ShieldAlert className="size-3.5" />}
                  Send for review
                </button>
                <button
                  type="button"
                  onClick={() => setReportOpen(false)}
                  className="rounded-xl px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                >
                  Cancel
                </button>
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The bounty money stays held while our team reviews it, and you&apos;re paid a partial
                trip fee for the journey you already made.
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={!state.unreachableEligible}
                onClick={() => setReportOpen(true)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                <ShieldAlert className="size-3.5" /> Contact unreachable — get a trip fee
              </button>
              <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
                {state.unreachableEligible
                  ? "Use this if you're on site and the PIN never came through. Your trip won't go unpaid."
                  : "Available 15 minutes after you claim this bounty, if the PIN still hasn't reached you."}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
