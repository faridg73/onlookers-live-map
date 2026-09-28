// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Check } from "lucide-react";
import { useEffect, useState } from "react";

type Props = {
  kind: "email" | "phone";
  value: string;
  setValue: (value: string) => void;
  verified: boolean;
  busy: boolean;
  error: string | null;
  onSend: () => void;
  onVerify: (code: string) => void;
  onChanged: () => void;
};

export function InlineVerificationField({ kind, value, setValue, verified, busy, error, onSend, onVerify, onChanged }: Props) {
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState("");
  const [seconds, setSeconds] = useState(0);
  const label = kind === "email" ? "Email" : "Mobile number";

  useEffect(() => {
    if (seconds <= 0) return;
    const timer = window.setTimeout(() => setSeconds((current) => current - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const send = () => {
    onSend();
    setSent(true);
    setSeconds(60);
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          type={kind === "email" ? "email" : "tel"}
          inputMode={kind === "email" ? "email" : "tel"}
          autoComplete={kind === "email" ? "email" : "tel"}
          required
          disabled={verified}
          value={value}
          onChange={(event) => {
            setValue(event.target.value);
            setSent(false);
            setCode("");
            setSeconds(0);
            onChanged();
          }}
          placeholder={kind === "email" ? "you@email.com" : "Mobile number"}
          aria-label={label}
          className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal disabled:opacity-80"
        />
        {verified ? (
          <span className="inline-flex min-w-24 items-center justify-center gap-1 rounded-2xl border border-signal/50 bg-signal/10 px-3 text-sm font-semibold text-signal">
            <Check className="size-4" aria-hidden /> Verified
          </span>
        ) : (
          <button type="button" onClick={send} disabled={busy || !value.trim() || (sent && seconds > 0)} className="min-w-24 rounded-2xl border border-signal px-3 text-sm font-semibold text-signal disabled:opacity-50">
            {sent && seconds > 0 ? `${seconds}s` : sent ? "Resend code" : "Send code"}
          </button>
        )}
      </div>
      {sent && !verified ? (
        <div className="flex gap-2">
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
            placeholder="6-digit code"
            aria-label={`${label} verification code`}
            className="min-w-0 flex-1 rounded-2xl border border-border bg-surface px-4 py-3 text-center text-sm tracking-[0.3em] text-foreground outline-none focus:border-signal"
          />
          <button type="button" onClick={() => onVerify(code)} disabled={busy || code.length !== 6} className="min-w-24 rounded-2xl bg-signal px-3 text-sm font-semibold text-signal-foreground disabled:opacity-50">
            Verify
          </button>
        </div>
      ) : null}
      {error ? <p role="alert" className="px-1 text-xs text-destructive">{error}</p> : null}
    </div>
  );
}