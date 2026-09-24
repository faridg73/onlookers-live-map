// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, BadgeCheck, Loader2, ShieldCheck, ShieldX, Star, UserRound } from "lucide-react";

/**
 * Public page the property contact opens from the approval text/email after the
 * Hunter taps "I'm on site". No account needed — the one-hour token is the key.
 */
export const Route = createFileRoute("/visit-approve")({
  head: () => ({
    meta: [
      { title: "Approve your on-site onlooker · Onlooker" },
      {
        name: "description",
        content: "Property contacts confirm the onlooker at their property with one tap — no account needed.",
      },
      { property: "og:title", content: "Approve your on-site onlooker · Onlooker" },
      { property: "og:description", content: "One-tap on-site approval for Onlooker verified visits." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: VisitApprovePage,
});

type Lookup = {
  location_name: string;
  hunter_name: string;
  hunter_avatar: string | null;
  hunter_verified: boolean;
  hunter_rating: number | null;
  expired: boolean;
  verified: boolean;
  denied: boolean;
  declined: boolean;
};

function VisitApprovePage() {
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<Lookup | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"approve" | "deny" | null>(null);
  const [denyOpen, setDenyOpen] = useState(false);
  const [note, setNote] = useState("");
  const [result, setResult] = useState<"approved" | "denied" | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get("t") ?? "";
    setToken(t);
    if (!t) {
      setLoading(false);
      return;
    }
    fetch(`/api/public/site-pin/approval?t=${encodeURIComponent(t)}`)
      .then(async (r) => {
        const body = await r.json();
        if (!r.ok) throw new Error(body.error ?? "This link is not valid.");
        setInfo(body as Lookup);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "This link is not valid."))
      .finally(() => setLoading(false));
  }, []);

  async function decide(approve: boolean) {
    setBusy(approve ? "approve" : "deny");
    setError("");
    try {
      const r = await fetch("/api/public/site-pin/approval", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, approve, note }),
      });
      const body = (await r.json()) as { result?: string; already?: string; error?: string };
      if (!r.ok) throw new Error(body.error ?? "Something went wrong.");
      setResult((body.result ?? body.already) === "approved" ? "approved" : "denied");
    } catch (e) {
      setError(e instanceof Error ? e.message : "We couldn't reach Onlooker. Try again.");
    } finally {
      setBusy(null);
    }
  }

  const final = result ?? (info?.verified ? "approved" : info?.denied ? "denied" : null);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-10">
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.18em] text-signal">
          Onlooker · On-site approval
        </p>

        {loading ? (
          <div className="flex items-center gap-2 py-10 text-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading…
          </div>
        ) : !info ? (
          <p className="mt-4 flex items-start gap-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            {error || "This link is missing its security code. Open the exact link from your text or email."}
          </p>
        ) : final === "approved" ? (
          <>
            <BadgeCheck className="mt-4 size-10 text-signal" />
            <h1 className="mt-2 font-display text-2xl font-extrabold text-foreground">Approved — thank you</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              {info.hunter_name} is now verified at {info.location_name}. Their app updated instantly and
              they can start filming.
            </p>
          </>
        ) : final === "denied" ? (
          <>
            <ShieldX className="mt-4 size-10 text-foreground" />
            <h1 className="mt-2 font-display text-2xl font-extrabold text-foreground">Got it — not approved</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This person can&apos;t verify or submit footage for your property. Our review team has been
              notified and the payment stays on hold.
            </p>
          </>
        ) : info.declined ? (
          <p className="mt-4 text-sm text-muted-foreground">This visit was already cancelled.</p>
        ) : info.expired ? (
          <p className="mt-4 text-sm text-muted-foreground">
            This approval link expired. Ask the onlooker to tap &ldquo;I&apos;m on site&rdquo; again for a
            fresh link, or give them the 6-digit PIN instead.
          </p>
        ) : (
          <>
            <h1 className="mt-2 font-display text-2xl font-extrabold text-foreground">Is this the right person?</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Someone says they&apos;re on site at <span className="text-foreground">{info.location_name}</span>.
            </p>

            <div className="mt-5 flex items-center gap-4 rounded-xl border border-border bg-background/70 p-4">
              {info.hunter_avatar ? (
                <img src={info.hunter_avatar} alt={info.hunter_name} className="size-16 rounded-full object-cover" />
              ) : (
                <div className="grid size-16 place-items-center rounded-full bg-secondary text-muted-foreground">
                  <UserRound className="size-7" />
                </div>
              )}
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 truncate text-lg font-bold text-foreground">
                  {info.hunter_name}
                  {info.hunter_verified && <BadgeCheck className="size-4 text-signal" />}
                </p>
                {info.hunter_rating ? (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Star className="size-3.5 text-signal" /> {Number(info.hunter_rating).toFixed(1)} rating
                  </p>
                ) : null}
              </div>
            </div>

            {denyOpen ? (
              <>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value.slice(0, 1000))}
                  rows={3}
                  placeholder="Optional: what's wrong? e.g. different person showed up."
                  className="mt-4 w-full rounded-xl border border-border bg-surface-raised px-3 py-2.5 text-sm text-foreground outline-none focus:border-signal"
                />
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => void decide(false)}
                    className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-destructive/60 px-4 py-3 text-xs font-bold uppercase tracking-[0.12em] text-destructive disabled:opacity-50"
                  >
                    {busy === "deny" ? <Loader2 className="size-4 animate-spin" /> : <ShieldX className="size-4" />}
                    Confirm — not them
                  </button>
                  <button
                    type="button"
                    onClick={() => setDenyOpen(false)}
                    className="rounded-xl px-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground"
                  >
                    Back
                  </button>
                </div>
              </>
            ) : (
              <>
                <button
                  type="button"
                  disabled={busy !== null}
                  onClick={() => void decide(true)}
                  className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-3.5 text-sm font-extrabold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
                >
                  {busy === "approve" ? <Loader2 className="size-4 animate-spin" /> : <ShieldCheck className="size-4" />}
                  Approve this onlooker
                </button>
                <button
                  type="button"
                  onClick={() => setDenyOpen(true)}
                  className="mt-2 w-full rounded-xl border border-border px-4 py-3 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground hover:text-foreground"
                >
                  This isn&apos;t the right person
                </button>
              </>
            )}
            {error && <p aria-live="polite" className="mt-3 text-xs font-medium text-destructive">{error}</p>}
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Only approve if you&apos;ve met or spoken to this person. Link works for 60 minutes.
            </p>
          </>
        )}
      </div>
    </main>
  );
}
