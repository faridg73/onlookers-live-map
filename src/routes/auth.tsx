import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";
import { rememberTermsAcceptance } from "@/lib/profile";
import { useHumanCheck } from "@/components/HumanCheck";
import { verifyHumanCheck } from "@/lib/turnstile.functions";
import { checkAuthAttempt } from "@/lib/auth-guard.functions";
import { PhoneVerification } from "@/components/PhoneVerification";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Onlooker — post and fulfil live bounties" },
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
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const human = useHumanCheck("sign-up");

  useEffect(() => {
    if (user) navigate({ to: "/profile" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error("You must accept the Terms of Service to continue.");
      return;
    }
    if (mode === "signup" && !human.ready) {
      toast.error("Finish the quick human check before creating your account.");
      return;
    }
    setBusy(true);
    rememberTermsAcceptance();
    try {
      const allowed = await checkAuthAttempt({ data: { email, mode } });
      if (!allowed.ok) throw new Error(allowed.error ?? "Please try again in a moment.");
      if (mode === "signup") {
        const check = await verifyHumanCheck({
          data: { token: human.token ?? "", action: "sign-up" },
        });
        if (!check.ok) throw new Error("The human check didn't pass. Please try again.");
        // Numbers are confirmed by text before the account is created.
        setVerifying(true);
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        void supabase.rpc("claim_verified_phone");
        toast.success("Welcome back.");
      }
    } catch (err) {
      human.reset();
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  /** Creates the account once the mobile number has been confirmed by text. */
  async function createAccount(phone: string) {
    setBusy(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin, data: { phone } },
      });
      if (error) throw error;
      setVerifying(false);
      void supabase.rpc("claim_verified_phone");
      toast.success("Number confirmed. Check your email to finish activating your account.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function oauth(provider: "google" | "apple") {
    if (!accepted) {
      toast.error("You must accept the Terms of Service to continue.");
      return;
    }
    rememberTermsAcceptance();
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error(result.error.message);
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-28 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        {mode === "signin" ? "Sign in" : "Create your account"}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Sign in to request or film real-world views — entry lines, seat views, queues and venue
        atmospheres — captured live on location.
      </p>

      <label className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-surface p-4 text-sm text-muted-foreground">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-signal"
        />
        <span>
          By signing in, you agree to Onlooker&rsquo;s{" "}
          <Link to="/terms" className="font-semibold text-foreground underline underline-offset-4">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link to="/privacy" className="font-semibold text-foreground underline underline-offset-4">
            Privacy Policy
          </Link>
          , acknowledging that you operate independently, assume all legal and physical liability,
          will only record in lawful public spaces without trespassing, and hold Onlooker harmless
          from any legal actions.
        </span>
      </label>

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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password (8+ characters)"
          className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
        />
        {mode === "signup" && human.widget}
        <button
          type="submit"
          disabled={busy || !accepted || (mode === "signup" && !human.ready)}
          className="w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
        >
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Sign up"}
        </button>
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
