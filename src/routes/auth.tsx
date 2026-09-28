// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { isUsernameAvailable, rememberTermsAcceptance, usernameProblem } from "@/lib/profile";
import { PasswordChecklist, passwordMeetsRules } from "@/components/PasswordChecklist";
import { clearPreviousAuthState, requireExactAuthenticatedUser } from "@/lib/auth-session";
import { useHumanCheck } from "@/components/HumanCheck";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import { checkAuthAttempt } from "@/lib/auth-guard.functions";
import { LegalConsent } from "@/components/legal/LegalConsent";
import { describeAuthError, describePasswordProblem } from "@/lib/auth-errors";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";
import { TwoFactorSetup } from "@/components/TwoFactorSetup";
import { InlineVerificationField } from "@/components/InlineVerificationField";
import { confirmPhoneCode, sendPhoneCode } from "@/lib/phone-verify.functions";
import { completeVerifiedSignup, confirmEmailSignupCode, sendEmailSignupCode } from "@/lib/signup-verification.functions";

export const Route = createFileRoute("/auth")({
  // Carries where the person was headed before sign-in, e.g. the live stream sheet.
  validateSearch: (
    search: Record<string, unknown>,
  ): { redirect?: string; mode?: "signin" | "signup" } => ({
    ...(typeof search["redirect"] === "string" && search["redirect"].startsWith("/")
      ? { redirect: search["redirect"] }
      : {}),
    ...(search["mode"] === "signup" || search["mode"] === "signin"
      ? { mode: search["mode"] as "signin" | "signup" }
      : {}),
  }),
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
  const { redirect, mode: initialMode } = Route.useSearch();

  /** Sends the person where they were headed, or to their profile by default. */
  const goAfterAuth = async () => {
    if (redirect) {
      // The live stream sheet greets the person with a welcome popup.
      if (/[?&]action=live/.test(redirect)) {
        try {
          sessionStorage.setItem("onlooker:welcome-live", "1");
        } catch {
          /* storage unavailable */
        }
      }
      await navigate({ href: redirect, replace: true });
      return;
    }
    await navigate({ to: "/profile", replace: true });
  };
  /** Lets someone leave sign-in without an account: back if possible, else home. */
  const leaveAuth = () => {
    if (window.history.length > 1 && window.history.state?.idx > 0) {
      window.history.back();
    } else {
      void navigate({ to: "/", replace: true });
    }
  };
  const [mode, setMode] = useState<"signin" | "signup">(initialMode ?? "signin");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [nameState, setNameState] = useState<"idle" | "checking" | "free" | "taken" | string>("idle");
  // Live duplicate check on the username while typing.
  useEffect(() => {
    const clean = username.trim();
    if (!clean) return setNameState("idle");
    const problem = usernameProblem(clean);
    if (problem) return setNameState(problem);
    setNameState("checking");
    const timer = window.setTimeout(() => {
      isUsernameAvailable(clean)
        .then((free) => setNameState(free ? "free" : "taken"))
        .catch(() => setNameState("idle"));
    }, 350);
    return () => window.clearTimeout(timer);
  }, [username]);
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [emailProof, setEmailProof] = useState("");
  const [phoneProof, setPhoneProof] = useState("");
  const [verifiedPhone, setVerifiedPhone] = useState("");
  const [emailVerificationError, setEmailVerificationError] = useState<string | null>(null);
  const [phoneVerificationError, setPhoneVerificationError] = useState<string | null>(null);
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



  /** Emails a password reset link for the address typed in the form. */
  async function sendPasswordReset() {
    if (!email) {
      setFormError("Type your email address above first.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      toast.success("Password reset email sent, check your inbox.");
      setFormError(null);
    } catch (err) {
      const described = describeAuthError(err);
      setFormError(described.message);
    } finally {
      setBusy(false);
    }
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
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError("Enter a valid email address, like you@email.com.");
      return;
    }
    if (mode === "signup") {
      const phoneDigits = phone.replace(/\D/g, "");
      const signupProblem =
        firstName.trim().length < 2 || lastName.trim().length < 2
          ? "Add your first and last name."
          : nameState === "taken"
            ? "That username is already taken, pick another."
            : nameState !== "free"
              ? "Choose an available username."
              : phoneDigits.length < 10 || phoneDigits.length > 15
                ? "Enter a valid mobile number, including area code."
              : !emailProof || !phoneProof
                ? "Verify both your email and mobile number before signing up."
              : !passwordMeetsRules(password)
                ? "Your password doesn't meet every requirement yet."
                : null;
      if (signupProblem) {
        setFormError(signupProblem);
        return;
      }
      const weak = describePasswordProblem(password, email);
      if (weak) {
        setFormError(weak);
        return;
      }
    }
    if (!human.ready) {
      const message =
        mode === "signup"
          ? "Finish the quick human check before creating your account."
          : "Just a moment, finishing the security check.";
      setFormError(message);
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
        await createAccount();
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
        await goAfterAuth();
      }
    } catch (err) {
      human.reset();
      const described = describeAuthError(err);
      setNeedsEmailConfirm(described.needsEmailConfirm);
      setFormError(described.message);
    } finally {
      setBusy(false);
    }
  }

  /** Creates an email-confirmed account only after both inline codes pass. */
  async function createAccount() {
    setBusy(true);
    try {
      await beginAccountSwitch();
      rememberTermsAcceptance();
      const result = await completeVerifiedSignup({
        data: {
          email,
          phone: verifiedPhone,
          emailProof,
          phoneProof,
          password,
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          username: username.trim(),
        },
      });
      if (!result.ok) throw new Error(result.error);
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error || !data.session || !data.user) throw error ?? new Error("Your account was created, but sign-in failed. Please sign in.");
      const authenticatedUser = await requireExactAuthenticatedUser(data.session);
      if (authenticatedUser.id !== data.user.id) throw new Error("The new account did not match. Please sign in again.");
      await supabase.rpc("claim_verified_phone");
      await queryClient.cancelQueries();
      queryClient.clear();
      setOfferTwoFactor(true);
    } catch (err) {
      const described = describeAuthError(err);
      setNeedsEmailConfirm(described.needsEmailConfirm);
      setFormError(described.message);
    } finally {
      setBusy(false);
    }
  }

  async function sendEmailCode() {
    setEmailVerificationError(null);
    try {
      const result = await sendEmailSignupCode({ data: { email } });
      if (!result.ok) throw new Error(result.error);
      toast.success("Email code sent.");
      return true;
    } catch (error) {
      setEmailVerificationError(error instanceof Error ? error.message : "Could not send the code.");
      return false;
    }
  }

  async function verifyEmailCode(code: string) {
    setEmailVerificationError(null);
    try {
      const result = await confirmEmailSignupCode({ data: { email, code } });
      if (!result.ok || !result.proof) throw new Error(result.error ?? "That code didn't work.");
      setEmailProof(result.proof);
      toast.success("Email verified.");
    } catch (error) {
      setEmailVerificationError(error instanceof Error ? error.message : "That code didn't work.");
    }
  }

  async function sendMobileCode() {
    setPhoneVerificationError(null);
    try {
      const result = await sendPhoneCode({ data: { phone, email, humanToken: human.token ?? undefined, humanAction: "sign-up" } });
      if (!result.ok || !result.phone) throw new Error(result.error ?? "Could not send the code.");
      setVerifiedPhone(result.phone);
      human.reset();
      toast.success("Mobile code sent.");
      return true;
    } catch (error) {
      setPhoneVerificationError(error instanceof Error ? error.message : "Could not send the code.");
      return false;
    }
  }

  async function verifyMobileCode(code: string) {
    setPhoneVerificationError(null);
    try {
      const result = await confirmPhoneCode({ data: { phone: verifiedPhone || phone, email, code } });
      if (!result.ok || !result.phone || !result.proof) throw new Error(result.error ?? "That code didn't work.");
      setVerifiedPhone(result.phone);
      setPhoneProof(result.proof);
      toast.success("Mobile number verified.");
    } catch (error) {
      setPhoneVerificationError(error instanceof Error ? error.message : "That code didn't work.");
    }
  }

  async function oauth(provider: "google" | "apple") {
    if (!accepted) {
      return;
    }
    try {
      await beginAccountSwitch();
      rememberTermsAcceptance();
      const result = await lovable.auth.signInWithOAuth(provider, {
        // Public same-origin landing spot, so social sign-in returns to the
        // sheet the person tapped instead of the home page.
        redirect_uri: redirect ? `${window.location.origin}${redirect}` : window.location.origin,
      });
      if (result.error) throw result.error;
      if (!result.redirected) {
        const { data } = await supabase.auth.getSession();
        if (!data.session) throw new Error("Social sign-in did not return a fresh session.");
        await requireExactAuthenticatedUser(data.session);
        await goAfterAuth();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Social sign-in failed.");
    }
  }

  if (offerTwoFactor) {
    return (
      <TwoFactorSetup
        onDone={() => {
          setOfferTwoFactor(false);
          void goAfterAuth();
        }}
      />
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-10">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={leaveAuth}
          aria-label="Go back"
          className="inline-flex size-9 items-center justify-center rounded-full border border-signal/60 bg-surface text-signal shadow-md shadow-signal/20 transition-colors hover:border-signal hover:bg-signal hover:text-signal-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ArrowLeft className="size-4" aria-hidden />
        </button>
        <button
          type="button"
          onClick={leaveAuth}
          aria-label="Close and go back"
          className="inline-flex size-9 items-center justify-center rounded-full border-2 border-signal bg-surface text-signal shadow-md shadow-signal/30 transition-colors hover:bg-signal hover:text-signal-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
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
        {mode === "signup" ? (
          <>
            <div className="grid grid-cols-2 gap-3">
              <input
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First name"
                autoComplete="given-name"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
              />
              <input
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last name"
                autoComplete="family-name"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
              />
            </div>
            <div>
              <input
                required
                value={username}
                onChange={(e) => setUsername(e.target.value.replace(/\s/g, ""))}
                placeholder="Username"
                autoCapitalize="none"
                autoComplete="off"
                className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
              />
              {nameState === "checking" ? (
                <p className="mt-1 px-1 text-xs text-muted-foreground">Checking…</p>
              ) : nameState === "free" ? (
                <p className="mt-1 px-1 text-xs text-signal">✓ Available</p>
              ) : nameState === "taken" ? (
                <p className="mt-1 px-1 text-xs text-destructive">✗ Already taken</p>
              ) : nameState !== "idle" ? (
                <p className="mt-1 px-1 text-xs text-destructive">{nameState}</p>
              ) : null}
            </div>
            <InlineVerificationField kind="phone" value={phone} setValue={setPhone} verified={Boolean(phoneProof)} busy={busy} error={phoneVerificationError} onSend={sendMobileCode} onVerify={(code) => void verifyMobileCode(code)} onChanged={() => { setPhoneProof(""); setVerifiedPhone(""); setPhoneVerificationError(null); }} />
          </>
        ) : null}
        {mode === "signup" ? (
          <InlineVerificationField kind="email" value={email} setValue={setEmail} verified={Boolean(emailProof)} busy={busy} error={emailVerificationError} onSend={sendEmailCode} onVerify={(code) => void verifyEmailCode(code)} onChanged={() => { setEmailProof(""); setPhoneProof(""); setVerifiedPhone(""); setEmailVerificationError(null); }} />
        ) : (
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal" />
        )}
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
        {mode === "signin" ? (
          <div className="px-1 text-right">
            <button
              type="button"
              onClick={() => void sendPasswordReset()}
              disabled={busy}
              className="text-xs text-muted-foreground underline-offset-4 hover:underline disabled:opacity-50"
            >
              Forgot your password?
            </button>
          </div>
        ) : null}
        {mode === "signup" ? (
          <>
            <PasswordChecklist password={password} />
            {password ? <PasswordStrengthMeter password={password} email={email} /> : null}
          </>
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
          disabled={busy || !accepted || !human.ready || (mode === "signup" && (!passwordMeetsRules(password) || nameState !== "free" || !emailProof || !phoneProof))}
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
