// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { checkResetEligibility } from "@/lib/password-reset.functions";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Forgot your password? | Onlooker" },
      { name: "description", content: "Get a link to reset your Onlooker password." },
      { property: "og:title", content: "Forgot your password? | Onlooker" },
      { property: "og:description", content: "Get a link to reset your Onlooker password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ForgotPasswordScreen,
});

const PROVIDER_NAMES: Record<string, string> = { google: "Google", apple: "Apple", azure: "Microsoft" };

/**
 * The address the emailed link should open. The in-editor preview runs on an
 * internal host that asks for a Lovable login when opened on a phone, so any
 * link we mail out has to point at a public Onlooker address instead.
 */
function resetLinkOrigin(): string {
  const origin = window.location.origin;
  const host = window.location.hostname.toLowerCase();
  const publicHost =
    host === "onlooker.io" ||
    host === "www.onlooker.io" ||
    host === "onlookerlive.com" ||
    host === "www.onlookerlive.com" ||
    host === "onlooker.lovable.app";
  return publicHost ? origin : "https://www.onlooker.io";
}

function ForgotPasswordScreen() {
  const check = useServerFn(checkResetEligibility);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [social, setSocial] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSocial(null);
    const addr = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(addr)) {
      setError("Enter a valid email address, like you@email.com.");
      return;
    }
    setBusy(true);
    try {
      const res = await check({ data: { email: addr } }).catch(() => null);
      if (res?.status === "social") {
        const names = res.providers.map((p) => PROVIDER_NAMES[p] ?? p).join(" or ");
        setSocial(names);
        return;
      }
      if (res?.status === "password") {
        const { error: err } = await supabase.auth.resetPasswordForEmail(addr, {
          redirectTo: `${resetLinkOrigin()}/reset-password`,
        });
        if (err) throw err;
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the reset email. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        Forgot your <span className="text-signal">password?</span>
      </h1>
      {sent ? (
        <div className="mt-6 space-y-4">
          <div role="status" className="rounded-2xl border border-signal/40 bg-signal/10 px-4 py-3 text-sm text-foreground">
            <p className="font-semibold">Check your email for a reset link.</p>
            <p className="mt-1 text-muted-foreground">
              If an account uses {email.trim()}, a link is on its way. It can take a minute — check spam too.
            </p>
          </div>
          <Link to="/auth" className="inline-block text-sm text-muted-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <p className="text-sm text-muted-foreground">
            Type the email you signed up with and we'll send you a link to choose a new password.
          </p>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
          {social ? (
            <div role="alert" className="rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground">
              <p className="font-semibold">This account uses {social} sign-in.</p>
              <p className="mt-1 text-muted-foreground">
                There's no password to reset — go back and tap "Continue with {social.split(" or ")[0]}".
              </p>
            </div>
          ) : null}
          {error ? (
            <div role="alert" className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
          >
            {busy ? "Sending…" : "Send reset link"}
          </button>
          <Link to="/auth" className="block text-center text-sm text-muted-foreground underline underline-offset-4">
            Back to sign in
          </Link>
        </form>
      )}
    </div>
  );
}
