import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { confirmPhoneCode, sendPhoneCode } from "@/lib/phone-verify.functions";
import { useHumanCheck } from "@/components/HumanCheck";

const CODE_LENGTH = 6;

type Props = {
  /** Email the new account will use — ties the confirmed number to it. */
  email: string;
  /** Called once the number is confirmed. */
  onVerified: (phone: string) => void;
  /** Called when someone backs out. */
  onCancel: () => void;
};

/** Two small screens: enter a mobile number, then type the code we text over. */
export function PhoneVerification({ email, onVerified, onCancel }: Props) {
  const [step, setStep] = useState<"number" | "code">("number");
  const [phone, setPhone] = useState("");
  const [sentTo, setSentTo] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);
  // Silent bot challenge so nobody can script the text-message trigger.
  const human = useHumanCheck("sms-code", { discreet: true });

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
      const result = await sendPhoneCode({
        data: { phone, email, humanToken: human.token ?? undefined },
      });
      if (!result.ok || !result.phone) throw new Error(result.error ?? "Could not send the code.");
      setSentTo(result.phone);
      setStep("code");
      setCode("");
      setSeconds(45);
      toast.success(resend ? "New code sent." : `Code sent to ${result.phone}.`);
    } catch (err) {
      human.reset();
      toast.error(err instanceof Error ? err.message : "Could not send the code.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(value: string) {
    setBusy(true);
    try {
      const result = await confirmPhoneCode({ data: { phone: sentTo, email, code: value } });
      if (!result.ok || !result.phone) throw new Error(result.error ?? "That code didn't work.");
      toast.success("Number confirmed.");
      onVerified(result.phone);
    } catch (err) {
      setCode("");
      codeRef.current?.focus();
      toast.error(err instanceof Error ? err.message : "That code didn't work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-6 rounded-3xl border border-border bg-surface p-5">
      {human.widget}
      {step === "number" ? (
        <>
          <h2 className="font-display text-xl tracking-tight text-foreground">
            Confirm your mobile number
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We text a {CODE_LENGTH}-digit code to make sure you&rsquo;re a real person before your
            account goes live.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="mt-4 space-y-3"
          >
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(555) 123-4567"
              className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
            />
            <button
              type="submit"
              disabled={busy || phone.trim().length < 7}
              className="w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
            >
              {busy ? "Sending…" : "Text me a code"}
            </button>
          </form>
        </>
      ) : (
        <>
          <h2 className="font-display text-xl tracking-tight text-foreground">Enter your code</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a {CODE_LENGTH}-digit code to{" "}
            <span className="font-semibold text-foreground">{sentTo}</span>.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (code.length === CODE_LENGTH) void confirm(code);
            }}
            className="mt-4 space-y-3"
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
              className="w-full rounded-2xl border border-border bg-surface-raised px-4 py-4 text-center font-display text-2xl tracking-[0.5em] text-foreground outline-none focus:border-signal"
            />
            <button
              type="submit"
              disabled={busy || code.length !== CODE_LENGTH}
              className="w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
            >
              {busy ? "Checking…" : "Confirm number"}
            </button>
          </form>
          <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
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

      <button
        type="button"
        onClick={onCancel}
        className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Back
      </button>
    </div>
  );
}
