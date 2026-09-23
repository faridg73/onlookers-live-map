// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

/**
 * Optional two-factor (authenticator app) setup shown right after signup.
 * Skippable by design — it encourages, never blocks.
 */
export function TwoFactorSetup({ onDone }: { onDone: () => void }) {
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data, error: enrollError } = await supabase.auth.mfa.enroll({
          factorType: "totp",
          friendlyName: "Onlooker authenticator",
        });
        if (enrollError) throw enrollError;
        if (cancelled) return;
        setQr(data.totp.qr_code);
        setSecret(data.totp.secret);
        setFactorId(data.id);
      } catch {
        if (!cancelled) setError("Two-factor setup isn't available right now. You can skip this and set it up later from your Profile.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function verify() {
    if (!factorId) return;
    setBusy(true);
    setError(null);
    try {
      const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
      if (challengeError) throw challengeError;
      const { error: verifyError } = await supabase.auth.mfa.verify({
        factorId,
        challengeId: challenge.id,
        code: code.trim(),
      });
      if (verifyError) throw verifyError;
      toast.success("Two-factor is on. Your account is much harder to break into now.");
      onDone();
    } catch {
      setError("That code didn't match. Check the time on your phone and try the latest 6-digit code.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-10">
      <div className="grid size-12 place-items-center rounded-full border border-signal/40 bg-signal/10 text-signal">
        <ShieldCheck className="size-6" />
      </div>
      <h1 className="mt-4 font-display text-3xl tracking-tight text-foreground">
        Add a second lock
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Protecting your account matters — you'll be linking this to real payments. Two-factor
        means a stolen password alone can't drain your balance or hijack your payouts.
      </p>

      {error ? (
        <div
          role="alert"
          className="mt-4 rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        >
          {error}
        </div>
      ) : null}

      {qr ? (
        <div className="mt-5 space-y-4">
          <div className="flex justify-center rounded-2xl border border-border bg-white p-4">
            <img src={qr} alt="Scan with your authenticator app" className="size-48" />
          </div>
          <p className="text-xs text-muted-foreground">
            Scan with Google Authenticator, 1Password, Authy or any authenticator app. Can't scan?
            Enter this key manually:{" "}
            <span className="select-all font-mono text-foreground">{secret}</span>
          </p>
          <input
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="6-digit code"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-center text-lg tracking-[0.4em] text-foreground outline-none focus:border-signal"
          />
          <button
            type="button"
            onClick={() => void verify()}
            disabled={busy || code.length !== 6}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-4 animate-spin" /> : null}
            Turn on two-factor
          </button>
        </div>
      ) : !error ? (
        <div className="mt-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Preparing your QR code…
        </div>
      ) : null}

      <button
        type="button"
        onClick={onDone}
        className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        Skip for now — you can set this up later from your Profile
      </button>
    </div>
  );
}
