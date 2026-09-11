import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/use-auth";

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

  useEffect(() => {
    if (user) navigate({ to: "/profile" });
  }, [user, navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!accepted) {
      toast.error("You must accept the Terms of Service to continue.");
      return;
    }
    setBusy(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back.");
      }
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
        You need an account to upload bounty videos and replay them later.
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
        onClick={google}
        disabled={!accepted}
        className="mt-4 w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground transition-colors hover:bg-surface-raised disabled:opacity-50"
      >
        Continue with Google
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
        <button
          type="submit"
          disabled={busy || !accepted}
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
