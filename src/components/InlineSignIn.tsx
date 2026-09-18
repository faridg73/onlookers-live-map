import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { rememberTermsAcceptance } from "@/lib/profile";
import { clearPreviousAuthState, requireExactAuthenticatedUser } from "@/lib/auth-session";
import { useHumanCheck } from "@/components/HumanCheck";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import { checkAuthAttempt } from "@/lib/auth-guard.functions";
import { LegalConsent } from "@/components/legal/LegalConsent";
import { describeAuthError } from "@/lib/auth-errors";

type InlineSignInProps = {
  title?: string;
  message?: string;
};

/**
 * A sign-in card that drops straight into a page's signed-out state, so
 * people can sign in right there. After signing in they stay on the page
 * they were on — it simply fills in with their own account's data.
 */
export function InlineSignIn({ title = "Sign in", message }: InlineSignInProps) {
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  // The same silent human check the /auth screen runs for sign-in.
  const human = useHumanCheck("sign-in", { discreet: true });

  async function beginAccountSwitch() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await clearPreviousAuthState();
  }

  /** Sends a fresh confirmation link when someone never received the first one. */
  async function resendConfirmation() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: window.location.origin },
      });
      if (error) throw error;
      toast.success("Verification email sent, check your inbox.");
      setFormError(null);
    } catch (err) {
      const described = describeAuthError(err);
      setNeedsEmailConfirm(described.needsEmailConfirm);
      setFormError(described.message);
      toast.error(described.message);
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    if (!accepted) {
      toast.error("You must accept the Terms of Service to continue.");
      return;
    }
    try {
      await beginAccountSwitch();
      rememberTermsAcceptance();
      // Return to the exact page this card sits on, so the signed-in view
      // loads here instead of bouncing to the home screen.
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin + window.location.pathname,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Social sign-in did not return a fresh session.");
        await requireExactAuthenticatedUser(data.session);
        await supabase.rpc("claim_verified_phone");
        toast.success("Welcome back.");
      }
    } catch (err) {
      const described = describeAuthError(err);
      setNeedsEmailConfirm(described.needsEmailConfirm);
      setFormError(described.message);
it      toast.error(described.message);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNeedsEmailConfirm(false);
    if (!accepted) {
      setFormError("You must accept the Terms of Service to continue.");
      toast.error("You must accept the Terms of Service to continue.");
      return;
    }
    if (!human.ready) {
      const message = "Just a moment, finishing the security check.";
      setFormError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    try {
      const allowed = await checkAuthAttempt({ data: { email, mode: "signin" } });
      if (!allowed.ok) throw new Error(allowed.error ?? "Please try again in a moment.");
      const check = await verifyHumanCheck({
        data: { token: human.token ?? "", action: "sign-in" },
      });
      if (!check.ok) throw new Error("The security check didn't pass. Please try again.");
      await beginAccountSwitch();
      rememberTermsAcceptance();
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) {
        throw error ?? new Error("Sign-in did not return a fresh session.");
      }
      const authenticatedUser = await requireExactAuthenticatedUser(data.session);
      if (authenticatedUser.id !== data.user.id) {
        await clearPreviousAuthState();
        throw new Error("The signed-in account did not match. Please try again.");
      }
      if (!authenticatedUser.email_confirmed_at) {
        await clearPreviousAuthState();
        setNeedsEmailConfirm(true);
        throw new Error(
          "Confirm your email address first, check your inbox for the verification link we sent.",
        );
      }
      await supabase.rpc("claim_verified_phone");
      // Stay on this page — the signed-in view of it takes over right here.
      toast.success("Welcome back.");
    } catch (err) {
      human.reset();
      const described = describeAuthError(err);
      setNeedsEmailConfirm(described.needsEmailConfirm);
      setFormError(described.message);
      toast.error(described.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      aria-label="Sign in"
      className="rounded-2xl border border-border bg-surface-raised p-4 sm:p-5"
    >
      <h2 className="font-display text-xl tracking-tight text-foreground">{title}</h2>
      {message ? <p className="mt-1 text-sm text-muted-foreground">{message}</p> : null}

      <LegalConsent accepted={accepted} onChange={setAccepted} className="mt-4" />

      <button
        type="button"
        onClick={() => oauth("google")}
        disabled={!accepted}
        className="mt-4 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised disabled:opacity-50"
      >
        Continue with Google
      </button>

      <button
        type="button"
        onClick={() => oauth("apple")}
        disabled={!accepted}
        className="mt-3 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised disabled:opacity-50"
      >
        Continue with Apple
      </button>

      <div className="my-4 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          autoComplete="email"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
        />
        <input
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
        />
        {human.widget}
        {formError ? (
          <div
            role="alert"
            aria-live="assertive"
            className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
          >
            <p>{formError}</p>
            {needsEmailConfirm ? (
              <button
                type="button"
                onClick={() => void resendConfirmation()}
                disabled={busy || !email}
                className="mt-2 text-sm font-semibold text-foreground underline underline-offset-4 disabled:opacity-50"
              >
                Resend verification email
              </button>
            ) : null}
          </div>
        ) : null}
        <button
          type="submit"
          disabled={busy || !accepted || !human.ready}
          aria-disabled={busy || !accepted || !human.ready}
          className="w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:cursor-not-allowed disabled:opacity-50"
        >
          {busy ? "Please wait…" : "Sign in"}
        </button>
        {!accepted ? (
          <p className="px-1 text-center text-xs text-muted-foreground">
            Tick the agreement box above to continue.
          </p>
        ) : null}
      </form>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        New here?{" "}
        <Link
          to="/auth"
          className="font-semibold text-foreground underline underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </section>
  );
}
