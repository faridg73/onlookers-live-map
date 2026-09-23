// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Check, Loader2, ShieldX } from "lucide-react";

/**
 * Public page the property contact lands on from the "this was not authorized"
 * link in their PIN text or email. No Onlooker account is needed — the token in
 * the link is the only credential.
 */
export const Route = createFileRoute("/pin-decline")({
  head: () => ({
    meta: [
      { title: "Report an unauthorized property visit · Onlooker" },
      {
        name: "description",
        content:
          "Property contacts can use this page to confirm a filming visit was never authorized, which cancels the request immediately.",
      },
      { property: "og:title", content: "Report an unauthorized property visit · Onlooker" },
      {
        property: "og:description",
        content: "Cancel an Onlooker property request that you never authorized.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PinDeclinePage,
});

function PinDeclinePage() {
  const token = typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("t") ?? "";
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/public/site-pin/decline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, note }),
      });
      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        setError(payload.error ?? "That link could not be used. Please contact support.");
        return;
      }
      setDone(true);
    } catch {
      setError("We couldn't reach Onlooker. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="mb-4 grid size-12 place-items-center rounded-full border border-border bg-background text-signal">
          <ShieldX className="size-6" />
        </div>

        {done ? (
          <>
            <h1 className="font-display text-2xl font-extrabold text-foreground">Thank you — it&apos;s cancelled</h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              The request for your property has been cancelled and the PIN no longer works. Nobody can
              submit footage for it. Our review team has a record of your response.
            </p>
            <p className="mt-3 flex items-start gap-2 rounded-xl border border-border bg-background/70 p-3 text-xs leading-relaxed text-muted-foreground">
              <Check className="mt-0.5 size-4 shrink-0 text-signal" />
              The money the poster set aside has been returned to them, and the person who already
              travelled to the property is paid a small trip fee — nothing further is charged to you.
            </p>
          </>
        ) : (
          <>
            <h1 className="font-display text-2xl font-extrabold text-foreground">
              Was this visit not authorized?
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              You received a 6-digit PIN for a paid Onlooker request at your property. If you never
              authorized anyone to film there, confirm below. We cancel the request immediately, the
              PIN stops working, and no footage can be submitted.
            </p>

            <label className="mt-5 block text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              Anything you want to add (optional)
            </label>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value.slice(0, 1000))}
              rows={4}
              placeholder="e.g. I am the listing agent and did not request this."
              className="mt-2 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none focus:border-signal"
            />

            {!token && (
              <p className="mt-3 flex items-start gap-2 text-xs font-medium text-destructive">
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                This link is missing its security code. Open the exact link from your text or email.
              </p>
            )}
            {error && (
              <p aria-live="polite" className="mt-3 text-xs font-medium text-destructive">
                {error}
              </p>
            )}

            <button
              type="button"
              disabled={!token || busy}
              onClick={() => void submit()}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3 text-xs font-extrabold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
            >
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Cancelling…
                </>
              ) : (
                "I did not authorize this — cancel it"
              )}
            </button>
            <p className="mt-3 text-center text-xs text-muted-foreground">
              Questions? Email <span className="text-foreground">legal@onlookerlive.com</span>
            </p>
          </>
        )}
      </div>
    </main>
  );
}
