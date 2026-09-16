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
import { LegalDialog, useLegalDialog } from "@/components/legal/LegalDialog";

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
  // Terms and Privacy open in a popup so a half-filled form is never lost.
  const legal = useLegalDialog();
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

  /**
   * Strong-password rules checked before the account service is called, so
   * people get instant, specific feedback instead of a generic rejection.
   */
  function describePasswordProblem(value: string): string | null {
    if (value.length < 10) return "Use at least 10 characters for your password.";
    if (!/[a-z]/.test(value) || !/[A-Z]/.test(value)) {
      return "Include both a small letter and a capital letter in your password.";
    }
    if (!/[0-9]/.test(value)) return "Include at least one number in your password.";
    if (!/[^A-Za-z0-9]/.test(value)) {
      return "Include at least one symbol, such as ! or ?, in your password.";
    }
    if (email && value.toLowerCase().includes(email.split("@")[0]?.toLowerCase() ?? "@@@")) {
      return "Your password can't contain your email name.";
    }
    return null;
  }

  /** Turns raw auth failures into plain-language messages people can act on. */
  function describeAuthError(err: unknown): string {
    const raw = err instanceof Error ? err.message : "";
    const code =
      typeof err === "object" && err !== null && "code" in err
        ? String((err as { code?: unknown }).code ?? "")
        : "";
    const text = `${code} ${raw}`.toLowerCase();
    if (text.includes("email_not_confirmed") || text.includes("email not confirmed")) {
      setNeedsEmailConfirm(true);
      return "Confirm your email address first, check your inbox for the verification link we sent.";
    }
    if (text.includes("invalid login") || text.includes("invalid_credentials")) {
      return "That email or password is incorrect. Check them and try again.";
    }
    if (text.includes("user already registered") || text.includes("already_exists")) {
      return "An account already exists for that email. Try signing in instead.";
    }
    if (text.includes("too many") || text.includes("rate limit")) {
      return "Too many attempts. Please wait a minute and try again.";
    }
    if (text.includes("pwned") || text.includes("compromised") || text.includes("leaked")) {
      return "That password has appeared in a known data breach. Please choose a different one.";
    }
    if (text.includes("weak_password") || text.includes("password should")) {
      return "That password is too weak. Use 10+ characters with a capital letter, a number and a symbol.";
    }
    return raw || "Something went wrong. Please try again.";
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
      const message = describeAuthError(err);
      setFormError(message);
      toast.error(message);
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
      const weak = describePasswordProblem(password);
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
      const message = describeAuthError(err);
      setFormError(message);
      toast.error(message);
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
      const message = describeAuthError(err);
      setFormError(message);
      toast.error(message);
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
      <div className="mx-auto max-w-md px-4 pb-28 pt-10">
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
    <div className="mx-auto max-w-md px-4 pb-28 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        {mode === "signin" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to request or film real-world views, entry lines, seat views, queues and venue
        atmospheres, captured live on location.
      </p>

      <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
        <input
          id="accept-legal"
          type="checkbox"
          required
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          aria-describedby="accept-legal-text"
          className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
        />
        <span id="accept-legal-text">
          <label htmlFor="accept-legal" className="cursor-pointer">
            I agree to Onlooker&rsquo;s{" "}
          </label>
          <button
            type="button"
            onClick={() => legal.open("terms")}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Terms of Service
          </button>{" "}
          and{" "}
          <button
            type="button"
            onClick={() => legal.open("privacy")}
            className="font-semibold text-foreground underline underline-offset-4"
          >
            Privacy Policy
          </button>
          <label htmlFor="accept-legal" className="cursor-pointer">
            , acknowledging that I operate independently, assume all legal and physical liability,
            will only record in lawful public spaces without trespassing, and hold Onlooker harmless
            from any legal actions.
          </label>
        </span>
      </div>

      <LegalDialog doc={legal.doc} onClose={legal.close} />


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
