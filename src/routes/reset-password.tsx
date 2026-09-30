// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { describePasswordProblem } from "@/lib/auth-errors";
import { PasswordStrengthMeter } from "@/components/PasswordStrengthMeter";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your Onlooker password" },
      {
        name: "description",
        content: "Choose a new password for your Onlooker account.",
      },
      { property: "og:title", content: "Reset your Onlooker password" },
      { property: "og:description", content: "Choose a new password for your Onlooker account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPasswordScreen,
});

function ResetPasswordScreen() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [linkProblem, setLinkProblem] = useState<string | null>(null);

  useEffect(() => {
    // The emailed link carries a one-time recovery sign-in. Depending on how
    // the link was opened it arrives either in the part after the "#" (works
    // on any device) or as a "code" in the address. Handle both, then show the
    // new-password form.
    let done = false;
    const finish = (ok: boolean) => {
      if (done) return;
      done = true;
      setReady(ok);
      setChecking(false);
    };

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") finish(true);
    });

    let poll: number | undefined;

    const run = async () => {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const query = new URLSearchParams(window.location.search);

      const linkError = hash.get("error_description") ?? query.get("error_description");
      if (linkError) {
        setLinkProblem(linkError);
        finish(false);
        return;
      }

      const accessToken = hash.get("access_token");
      const refreshToken = hash.get("refresh_token");
      if (accessToken && refreshToken) {
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
        window.history.replaceState({}, "", window.location.pathname);
        finish(!error);
        if (error) setLinkProblem(error.message);
        return;
      }

      const code = query.get("code");
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
          window.history.replaceState({}, "", window.location.pathname);
          finish(true);
          return;
        }
      }

      const { data } = await supabase.auth.getSession();
      if (data.session) {
        finish(true);
        return;
      }

      let attempts = 0;
      poll = window.setInterval(() => {
        attempts += 1;
        void supabase.auth.getSession().then(({ data: later }) => {
          if (later.session) {
            finish(true);
            window.clearInterval(poll);
          } else if (attempts >= 8) {
            finish(false);
            window.clearInterval(poll);
          }
        });
      }, 400);
    };

    void run();

    return () => {
      if (poll) window.clearInterval(poll);
      subscription.unsubscribe();
    };
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    const weak = describePasswordProblem(password, "");
    if (weak) {
      setFormError(weak);
      return;
    }
    if (password !== confirm) {
      setFormError("The two passwords don't match.");
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      toast.success("Password updated. You're signed in.");
      await navigate({ to: "/profile", replace: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not update the password.";
      setFormError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 pb-32 pt-10">
      <h1 className="font-display text-3xl tracking-tight text-foreground">
        Choose a new <span className="text-signal">password</span>
      </h1>
      {checking ? (
        <p className="mt-4 text-sm text-muted-foreground">Checking your reset link…</p>
      ) : !ready ? (
        <div className="mt-4 space-y-3">
          <p className="text-sm text-muted-foreground">
            {linkProblem
              ? `${linkProblem} Request a fresh link from the sign-in page.`
              : "This reset link has expired or was already used. Request a fresh one from the sign-in page."}
          </p>
          <button
            type="button"
            onClick={() => void navigate({ to: "/auth" })}
            className="rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-3">
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="New password (10+ characters)"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
          <PasswordStrengthMeter password={password} email="" />
          <input
            type="password"
            required
            minLength={10}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Repeat the new password"
            className="w-full rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
          {formError ? (
            <div
              role="alert"
              aria-live="assertive"
              className="rounded-2xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
            >
              <p>{formError}</p>
            </div>
          ) : null}
          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:cursor-not-allowed disabled:opacity-50"
          >
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
    </div>
  );
}
