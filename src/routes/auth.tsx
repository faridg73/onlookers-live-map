// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { rememberTermsAcceptance } from "@/lib/profile";
import { clearPreviousAuthState, requireExactAuthenticatedUser } from "@/lib/auth-session";
import { useHumanCheck } from "@/components/HumanCheck";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import { checkAuthAttempt } from "@/lib/auth-guard.functions";
import { PhoneVerification } from "@/components/PhoneVerification";
import { LegalConsent } from "@/components/legal/LegalConsent";
import { describeAuthError, describePasswordProblem } from "@/lib/auth-errors";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Onlooker, post and fulfil live bounties" },
      {
        name: "description",
        content:
          "Sign in to Onlooker to post live view bounties, upload fulfilment videos and replay them any time.",
      },
      { property: "og:title", content: "Sign in to Onlooker" },
      {
        property: "og:description",
        content: "Sign in to post live view bounties and upload fulfilment videos.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthScreen,
});

function AuthScreen() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [needsEmailConfirm, setNeedsEmailConfirm] = useState(false);
  const [offerTwoFactor, setOfferTwoFactor] = useState(false);
  // Sign-up shows the visible tick box; sign-in runs the same challenge
  // silently so brute-force attempts get blocked without friction.
  const human = useHumanCheck(mode === "signup" ? "sign-up" : "sign-in", {
    discreet: mode === "signin",
  });

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

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNeedsEmailConfirm(false);
    if (!accepted) {
      setFormError("You must accept the Terms of Service to continue.");
      toast.error("You must accept the Terms of Service to continue.");
      return;
    }
    if (mode === "signup") {
      const weak = describePasswordProblem(password, email);
      if (weak) {
        setFormError(weak);
        toast.error(weak);
        return;
      }
    }
    if (!human.ready) {
      const message =
        mode === "signup"
          ? "Finish the quick human check before creating your account."
          : "Just a moment, finishing the security check.";
      setFormError(message);
      toast.error(message);
      return;
    }
    setBusy(true);
    try {
      const allowed = await checkAuthAttempt({ data: { email, mode } });
      if (!allowed.ok) throw new Error(allowed.error ?? "Please try again in a moment.");
      const check = await verifyHumanCheck({
        data: { token: human.token ?? "", action: mode === "signup" ? "sign-up" : "sign-in" },
      });
      if (!check.ok) throw new Error("The security check didn't pass. Please try again.");
      if (mode === "signup") {
        // Numbers are confirmed by text before the account is created.
        await beginAccountSwitch();
        rememberTermsAcceptance();
        setVerifying(true);
      } else {
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
        await queryClient.cancelQueries();
        queryClient.clear();
        toast.success("Welcome back.");
        await navigate({ to: "/profile", replace: true });
      }
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

  /** Creates the account once the mobile number has been confirmed by text. */
  async function createAccount(phone: string) {
    setBusy(true);
    try {
      await beginAccountSwitch();
      rememberTermsAcceptance();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { phone } },
      });
      if (error) throw error;
      setVerifying(false);
      if (data.session && data.user) {
        const authenticatedUser = await requireExactAuthenticatedUser(data.session);
        if (authenticatedUser.id !== data.user.id) {
          await clearPreviousAuthState();
          throw new Error("The new account did not match. Please sign in again.");
        }
        await supabase.rpc("claim_verified_phone");
        await queryClient.cancelQueries();
        queryClient.clear();
        await navigate({ to: "/profile", replace: true });
      } else {
        setMode("signin");
        setNeedsEmailConfirm(true);
        setFormError(
          "Number confirmed. We emailed a verification link to " +
            email +
            ", open it to activate your account, then sign in.",
        );
        toast.success("Check your email for the verification link.");
      }
    } catch (err) {
      setVerifying(false);
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
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Social sign-in did not return a fresh session.");
        await requireExactAuthenticatedUser(data.session);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Social sign-in failed.");
    }
  }

  if (verifying) {
    return (
      <div className="mx-auto max-w-md px-4 pb-32 pt-10">
        <h1 className="font-display text-3xl tracking-tight text-foreground">
          One last check
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Almost there, confirm your mobile number and we&rsquo;ll finish setting up{" "}
          <span className="font-semibold text-foreground">{email}</span>.
        </p>
        <PhoneVerification
          email={email}
          onVerified={(phone) => void createAccount(phone)}
          onCancel={() => {
            setVerifying(false);
            human.reset();
          }}
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        {mode === "signin" ? (
          <>Sign <span className="text-signal">in</span></>
        ) : (
          <>Create your <span className="text-signal">account</span></>
        )}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to request or film real-world views, entry lines, seat views, queues and venue
        atmospheres, captured live on location.
      </p>

      <LegalConsent accepted={accepted} onChange={setAccepted} />


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

      <div className="my-5 flex items-center gap-3 text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
        <span className="h-px flex-1 bg-border" /> or <span className="h-px flex-1 bg-border" />
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@email.com"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
        />
        <input
          type="password"
          required
          minLength={mode === "signup" ? 10 : 8}
          autoComplete={mode === "signup" ? "new-password" : "current-password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={mode === "signup" ? "Password (10+ characters)" : "Password"}
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
        />
        {mode === "signup" ? (
          <p className="px-1 text-xs text-muted-foreground">
            At least 10 characters with a capital letter, a number and a symbol. Passwords found in
            known data breaches are rejected.
          </p>
        ) : null}
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
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
        {!accepted ? (
          <p className="px-1 text-center text-xs text-muted-foreground">
            Tick the agreement box above to continue.
          </p>
        ) : null}
      </form>

      <button
        type="button"
        onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
        className="mt-5 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
      >
        {mode === "signin" ? "New here? Create an account" : "Already have an account? Sign in"}
      </button>
    </div>
  );
}
