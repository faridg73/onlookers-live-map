import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { BadgeDollarSign, Gavel, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import { isAdmin, listAllPayoutRequests, resolvePayout, type AdminPayout } from "@/lib/admin";
import { listDisputes, type DisputeCase } from "@/lib/disputes";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Onlooker admin dashboard — payouts and disputes" },
      {
        name: "description",
        content:
          "Admin control panel for Onlooker: review open disputes and approve or deny hunter payout requests.",
      },
      { property: "og:title", content: "Onlooker admin dashboard" },
      {
        property: "og:description",
        content: "Review open disputes and settle hunter payout requests.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AdminDashboard,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function AdminDashboard() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [payouts, setPayouts] = useState<AdminPayout[]>([]);
  const [disputes, setDisputes] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [rows, cases] = await Promise.all([
        listAllPayoutRequests().catch(() => [] as AdminPayout[]),
        listDisputes().catch(() => [] as DisputeCase[]),
      ]);
      setPayouts(rows);
      setDisputes(cases);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    let alive = true;
    if (!user) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    void (async () => {
      const ok = await isAdmin();
      if (!alive) return;
      setAllowed(ok);
      if (ok) await refresh();
      else setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, authLoading, refresh]);

  async function decide(row: AdminPayout, approve: boolean) {
    setBusyId(row.id);
    try {
      await resolvePayout(row.id, approve, approve ? "Paid by admin" : "Declined by admin");
      toast.success(
        approve
          ? `${money(row.amount)} marked as paid to ${row.hunter_name}.`
          : `Payout declined — ${money(row.amount)} returned to ${row.hunter_name}.`,
      );
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't settle that payout.");
    } finally {
      setBusyId(null);
    }
  }

  if (allowed === false) {
    return (
      <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-16 text-center">
        <ShieldCheck className="mx-auto size-8 text-signal" />
        <h1 className="mt-4 font-display text-2xl text-foreground">Admins only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is limited to Onlooker admin accounts.
        </p>
        <Link
          to={user ? "/profile" : "/auth"}
          className="mt-6 inline-flex rounded-full bg-signal px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground"
        >
          {user ? "Back to profile" : "Sign in"}
        </Link>
      </main>
    );
  }

  const waiting = payouts.filter((p) => p.status === "pending" || p.status === "requested");
  const settled = payouts.filter((p) => !(p.status === "pending" || p.status === "requested"));

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-8">
      <header className="flex items-start gap-3">
        <ShieldCheck className="mt-1 size-6 text-signal" />
        <div>
          <h1 className="font-display text-2xl text-foreground">Admin dashboard</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Settle payout requests and keep an eye on open disputes.
          </p>
        </div>
      </header>

      {loading && <p className="mt-8 text-center text-sm text-muted-foreground">Loading…</p>}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
          <BadgeDollarSign className="size-4 text-signal" /> Payout requests
        </h2>

        {!loading && waiting.length === 0 && (
          <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No payout requests waiting.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {waiting.map((row) => (
            <article key={row.id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-base text-foreground">
                    {row.hunter_name}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {row.destination} · {new Date(row.created_at).toLocaleString()}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold text-signal">
                  {money(row.amount)}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void decide(row, true)}
                  className="flex items-center justify-center gap-2 rounded-xl bg-signal px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
                >
                  {busyId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : null} Approve
                  payout
                </button>
                <button
                  type="button"
                  disabled={busyId === row.id}
                  onClick={() => void decide(row, false)}
                  className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground disabled:opacity-50"
                >
                  Deny payout
                </button>
              </div>
            </article>
          ))}
        </div>

        {settled.length > 0 && (
          <div className="mt-4 space-y-2">
            <p className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
              Settled
            </p>
            {settled.map((row) => (
              <div
                key={row.id}
                className="flex items-center justify-between rounded-xl border border-border bg-surface px-3 py-2 text-xs"
              >
                <span className="truncate text-foreground">
                  {row.hunter_name} · {money(row.amount)}
                </span>
                <span className="capitalize text-muted-foreground">{row.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
          <Gavel className="size-4 text-signal" /> Open disputes
        </h2>

        {!loading && disputes.length === 0 && (
          <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            No open disputes right now.
          </p>
        )}

        <div className="mt-3 space-y-3">
          {disputes.map((c) => (
            <article key={c.request_id} className="rounded-2xl border border-border bg-surface p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-base text-foreground">{c.prompt}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {c.location_name}
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold text-signal">
                  {money(c.amount)} held
                </span>
              </div>
              <p className="mt-3 rounded-xl bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
                Reason: {c.dispute_reason || "No reason given."}
              </p>
            </article>
          ))}
        </div>

        <Link
          to="/admin/disputes"
          className="mt-4 inline-flex rounded-full border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-foreground"
        >
          Open dispute review
        </Link>
      </section>
    </main>
  );
}
