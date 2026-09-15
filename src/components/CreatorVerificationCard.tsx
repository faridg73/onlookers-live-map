import { useEffect, useRef, useState } from "react";
import { BadgeCheck, ShieldCheck, Smartphone } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { VerifiedBadge } from "@/components/VerifiedBadge";
import { confirmCreatorPhoneCode, sendCreatorPhoneCode } from "@/lib/creator-verify.functions";
import { fetchMyVerification, type VerificationStatus } from "@/lib/verification";

const CODE_LENGTH = 6;

/** Verify yourself instantly with a texted code. No manual review, no documents. */
export function CreatorVerificationCard() {
  const [status, setStatus] = useState<VerificationStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"number" | "code">("number");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  // iOS autofill can fire twice in a row — keep one code from being checked twice.
  const checkingRef = useRef(false);

  useEffect(() => {
    let active = true;
    fetchMyVerification()
      .then((next) => {
        if (active) setStatus(next);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (step === "code") codeRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => clearTimeout(timer);
  }, [seconds]);

  async function send(resend = false) {
    setBusy(true);
    try {
      const result = await sendCreatorPhoneCode({ data: { phone } });
      if (!result.ok || !result.phone) throw new Error(result.error ?? "Could not send the code.");
      setSentTo(result.phone);
      setStep("code");
      setCode("");
      setSeconds(45);
      toast.success(resend ? "New code sent." : `Code sent to ${result.phone}.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(value: string) {
    if (checkingRef.current) return;
    checkingRef.current = true;
    setBusy(true);
    try {
      const result = await confirmCreatorPhoneCode({ data: { phone: sentTo, code: value } });
      if (!result.ok) throw new Error(result.error ?? "That code didn't work.");
      setStatus({ isVerified: true, requestedAt: null });
      toast.success("You're verified. Free live broadcasting is unlocked.");
    } catch (err) {
      setCode("");
      codeRef.current?.focus();
      toast.error(err instanceof Error ? err.message : "That code didn't work.");
    } finally {
      checkingRef.current = false;
      setBusy(false);
    }
  }

  if (loading || !status) return null;

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 text-sm font-bold text-foreground">
          <ShieldCheck className="size-4 text-signal" /> Creator verification
        </p>
        {status.isVerified && <VerifiedBadge variant="pill" />}
      </div>

      {status.isVerified ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Your number is confirmed and your account is verified. The green check mark shows next to
          your name everywhere, and you can go live for free straight away.
        </p>
      ) : step === "number" ? (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Confirm your mobile number to get verified instantly. Verified creators get a check mark
            next to their name and can broadcast live for free, with no credits held.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="mt-3 space-y-3"
          >
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              aria-label="Mobile number"
              className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
            />
            <Button
              type="submit"
              size="sm"
              disabled={busy || phone.trim().length < 7}
              className="w-full gap-2"
            >
              <Smartphone className="size-4" />
              {busy ? "Sending…" : "Verify via SMS"}
            </Button>
          </form>
        </>
      ) : (
        <>
          <p className="mt-2 text-xs text-muted-foreground">
            Enter the {CODE_LENGTH}-digit code we texted to{" "}
            <span className="font-semibold text-foreground">{sentTo}</span>.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === CODE_LENGTH) void confirm(code);
            }}
            className="mt-3 space-y-3"
          >
            <input
              ref={codeRef}
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={CODE_LENGTH}
              value={code}
              onChange={(e) => {
                const next = e.target.value.replace(/\D/g, "").slice(0, CODE_LENGTH);
                setCode(next);
                if (next.length === CODE_LENGTH && !busy) void confirm(next);
              }}
              placeholder="••••••"
              aria-label="Verification code"
              className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-center font-display text-xl tracking-[0.5em] text-foreground outline-none focus:border-signal"
            />
            <Button
              type="submit"
              size="sm"
              disabled={busy || code.length !== CODE_LENGTH}
              className="w-full gap-2"
            >
              <BadgeCheck className="size-4" />
              {busy ? "Checking…" : "Confirm and verify"}
            </Button>
          </form>
          <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
            <button
              type="button"
              onClick={() => setStep("number")}
              className="underline-offset-4 hover:underline"
            >
              Change number
            </button>
            <button
              type="button"
              disabled={busy || seconds > 0}
              onClick={() => void send(true)}
              className="underline-offset-4 hover:underline disabled:opacity-50"
            >
              {seconds > 0 ? `Resend in ${seconds}s` : "Resend code"}
            </button>
          </div>
        </>
      )}
    </section>
  );
}
