import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import {
  BadgeDollarSign,
  Ban,
  Gauge,
  Loader2,
  MapPin,
  Search,
  ShieldAlert,
  TriangleAlert,
  Undo2,
} from "lucide-react";
import { coinsToUsdValue } from "@/lib/coins";
import { toast } from "sonner";

import { useAuth } from "@/hooks/use-auth";
import {
  banUser,
  getPlatformMetrics,
  isAdmin,
  listModerationLog,
  listPayoutQueue,
  resolvePayout,
  unbanUser,
  warnUser,
  type AdminMetrics,
  type ModerationEntry,
  type PayoutQueueRow,
} from "@/lib/admin";

export const Route = createFileRoute("/admin-control")({
  head: () => ({
    meta: [
      { title: "Onlooker control center — moderation, cash-outs, metrics" },
      {
        name: "description",
        content:
          "Admin control center for Onlooker Live: review flagged content, approve hunter cash-outs and track platform volume.",
      },
      { property: "og:title", content: "Onlooker control center" },
      {
        property: "og:description",
        content: "Moderate flagged content, settle cash-outs and watch platform volume in one place.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ControlCenter,
});

const money = (n: number) => `$${n.toFixed(2)}`;
const coins = (n: number) => `${Math.round(n).toLocaleString()} LC`;
const when = (iso: string) => new Date(iso).toLocaleString();

type Tab = "moderation" | "cashouts" | "metrics";

const TABS: { id: Tab; label: string; icon: typeof Gauge }[] = [
  { id: "moderation", label: "Moderation", icon: ShieldAlert },
  { id: "cashouts", label: "Cash-outs", icon: BadgeDollarSign },
  { id: "metrics", label: "Metrics", icon: Gauge },
];

function ControlCenter() {
  const { user, loading: authLoading } = useAuth();
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [tab, setTab] = useState<Tab>("moderation");
  const [flags, setFlags] = useState<ModerationEntry[]>([]);
  const [payouts, setPayouts] = useState<PayoutQueueRow[]>([]);
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const [log, queue, stats] = await Promise.all([
        listModerationLog().catch(() => [] as ModerationEntry[]),
        listPayoutQueue().catch(() => [] as PayoutQueueRow[]),
        getPlatformMetrics().catch(() => null),
      ]);
      setFlags(log);
      setPayouts(queue);
      setMetrics(stats);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setAllowed(false);
      setLoading(false);
      return;
    }
    void (async () => {
      const ok = await isAdmin();
      setAllowed(ok);
      if (ok) await refresh();
      else setLoading(false);
    })();
  }, [authLoading, user, refresh]);

  const act = async (id: string, run: () => Promise<void>, done: string) => {
    setBusyId(id);
    try {
      await run();
      toast.success(done);
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "That action didn't go through.");
    } finally {
      setBusyId(null);
    }
  };

  if (authLoading || allowed === null) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-live" />
      </main>
    );
  }

  if (!allowed) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-4 px-6 text-center">
        <ShieldAlert className="size-10 text-live" />
        <h1 className="text-xl font-bold text-foreground">Control center is admin-only</h1>
        <p className="text-sm text-muted-foreground">
          This area is reserved for the Onlooker review team.
        </p>
        <Link to="/" className="text-sm font-semibold text-live underline">
          Back to the map
        </Link>
      </main>
    );
  }

  const pending = payouts.filter((row) => row.status === "pending" || row.status === "requested");
  const needle = query.trim().toLowerCase();
  const visibleFlags = needle
    ? flags.filter((flag) =>
        [flag.title, flag.details ?? "", flag.display_name, ...flag.matched_terms]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : flags;

  return (
    <main className="mx-auto min-h-dvh w-full max-w-3xl px-4 pb-24 pt-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-foreground">Control center</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Flagged content, hunter cash-outs and live platform volume.
        </p>
      </header>

      <nav className="mb-6 grid grid-cols-3 gap-2 rounded-2xl border border-border bg-surface-raised p-1.5">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold transition ${
              tab === id
                ? "bg-live text-live-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Icon className="size-4" />
            {label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="size-6 animate-spin text-live" />
        </div>
      ) : tab === "moderation" ? (
        <section className="space-y-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search flags, users or keywords — e.g. Ticketmaster"
              className="w-full rounded-xl border border-border bg-surface-raised py-2.5 pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-live/40"
            />
          </div>
          {visibleFlags.length === 0 ? (
            <Empty text={needle ? "No flags match that search." : "Nothing flagged. The content filter is quiet."} />
          ) : (
            visibleFlags.map((flag) => (
              <article key={flag.id} className="rounded-2xl border border-border bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{flag.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {flag.display_name} · {when(flag.created_at)}
                    </p>
                  </div>
                  {flag.banned_at ? (
                    <span className="shrink-0 rounded-full bg-destructive/15 px-2 py-1 text-[11px] font-bold text-destructive">
                      Suspended
                    </span>
                  ) : flag.warning_count > 0 ? (
                    <span className="shrink-0 rounded-full bg-amber-500/15 px-2 py-1 text-[11px] font-bold text-amber-500">
                      {flag.warning_count} warning{flag.warning_count === 1 ? "" : "s"}
                    </span>
                  ) : null}
                </div>
                {flag.details ? (
                  <p className="mt-2 line-clamp-3 text-xs text-foreground/80">{flag.details}</p>
                ) : null}
                {flag.matched_terms.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {flag.matched_terms.map((term) => (
                      <span
                        key={term}
                        className="rounded-full border border-border px-2 py-0.5 text-[11px] font-semibold text-muted-foreground"
                      >
                        {term}
                      </span>
                    ))}
                  </div>
                ) : null}
                {flag.user_id ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === flag.id}
                      onClick={() =>
                        void act(
                          flag.id,
                          () => warnUser(flag.user_id!, `Flagged content: ${flag.title}`).then(() => undefined),
                          "Warning sent.",
                        )
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
                    >
                      <TriangleAlert className="size-3.5" /> Warn
                    </button>
                    {flag.banned_at ? (
                      <button
                        type="button"
                        disabled={busyId === flag.id}
                        onClick={() => void act(flag.id, () => unbanUser(flag.user_id!), "Suspension lifted.")}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
                      >
                        <Undo2 className="size-3.5" /> Restore access
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={busyId === flag.id}
                        onClick={() =>
                          void act(
                            flag.id,
                            () => banUser(flag.user_id!, `Repeated policy breach: ${flag.title}`),
                            "Account suspended.",
                          )
                        }
                        className="inline-flex items-center gap-1.5 rounded-xl bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground disabled:opacity-50"
                      >
                        <Ban className="size-3.5" /> Suspend account
                      </button>
                    )}
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      ) : tab === "cashouts" ? (
        <section className="space-y-3">
          {pending.length > 0 ? null : <Empty text="No cash-outs waiting for review." />}
          {payouts.map((row) => {
            const open = row.status === "pending" || row.status === "requested";
            return (
              <article key={row.id} className="rounded-2xl border border-border bg-surface-raised p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{row.display_name}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {row.coins_redeemed > 0 ? `${row.coins_redeemed} coins redeemed · ` : ""}
                      {row.coin_balance} coins on hand · {when(row.created_at)}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">{row.destination}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-base font-black text-foreground">{coins(row.amount)}</p>
                    <p className="text-[0.62rem] font-bold text-muted-foreground">
                      {money(coinsToUsdValue(Math.round(row.amount)))} cash
                    </p>
                    <p className="text-[11px] font-bold uppercase tracking-wide text-muted-foreground">
                      {row.status}
                    </p>
                  </div>
                </div>
                {open ? (
                  <div className="mt-3 flex flex-wrap gap-2">
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() =>
                        void act(row.id, () => resolvePayout(row.id, true, "Approved in control center"), "Transfer approved.")
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl bg-live px-3 py-2 text-xs font-black text-live-foreground disabled:opacity-50"
                    >
                      <BadgeDollarSign className="size-3.5" /> Approve &amp; trigger transfer
                    </button>
                    <button
                      type="button"
                      disabled={busyId === row.id}
                      onClick={() =>
                        void act(row.id, () => resolvePayout(row.id, false, "Denied in control center"), "Cash-out denied and refunded.")
                      }
                      className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
                    >
                      Deny &amp; refund
                    </button>
                  </div>
                ) : row.stripe_transfer_id ? (
                  <p className="mt-2 truncate text-[11px] text-muted-foreground">
                    Transfer {row.stripe_transfer_id}
                  </p>
                ) : null}
              </article>
            );
          })}
        </section>
      ) : (
        <section className="grid grid-cols-2 gap-3">
          <Metric label="Gross processed" value={coins(metrics?.gross_usd ?? 0)} icon={BadgeDollarSign} />
          <Metric label="Platform cut" value={coins(metrics?.platform_cut_usd ?? 0)} icon={Gauge} />
          <Metric label="Active pins" value={String(metrics?.active_pins ?? 0)} icon={MapPin} />
          <Metric label="Cash-outs pending" value={coins(metrics?.pending_payouts_usd ?? 0)} icon={BadgeDollarSign} />
          <Metric label="Clips expired" value={String(metrics?.expired_clips ?? 0)} icon={TriangleAlert} />
        </section>
      )}

      <p className="mt-8 text-center text-xs text-muted-foreground">
        Clips and their video files are deleted automatically 24 hours after upload.
      </p>
    </main>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-2xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
      {text}
    </p>
  );
}

function Metric({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: typeof Gauge;
}) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised p-4">
      <Icon className="size-4 text-live" />
      <p className="mt-2 text-xl font-black text-foreground">{value}</p>
      <p className="text-xs font-semibold text-muted-foreground">{label}</p>
    </div>
  );
}
