// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BadgeDollarSign,
  Camera,
  Clock,
  Gavel,
  Loader2,
  Lock,
  MapPin,
  Radio,
  Video,
} from "lucide-react";
import { toast } from "sonner";

import { BountyVideoDialog } from "@/components/BountyVideoDialog";
import { useAuth } from "@/hooks/use-auth";
import { formatCredits, formatCreditCash } from "@/lib/credits";
import { formatAgoISO, locationTypeById, type LiveRequest } from "@/lib/onlooker";
import {
  listMyPostedBounties,
  type PostedBountyRow,
  type PostedBountyStage,
} from "@/lib/requests.functions";
import { refundBounty } from "@/lib/bounty-escrow";

type TabId = "open" | "progress" | "settled";

const TABS: { id: TabId; label: string; stages: PostedBountyStage[] }[] = [
  { id: "open", label: "Open", stages: ["open"] },
  { id: "progress", label: "In progress", stages: ["claimed", "submitted", "disputed"] },
  { id: "settled", label: "Settled", stages: ["completed", "expired"] },
];

const EMPTY: Record<TabId, string> = {
  open: "Nothing open right now — post a bounty and it lands here the moment it's live.",
  progress: "No bounty is being worked yet. Open ones show up here as soon as an onlooker claims them.",
  settled: "Nothing settled yet. Approved footage and refunds will stack up here.",
};

const STAGE_COPY: Record<PostedBountyStage, { label: string; tone: string }> = {
  open: { label: "Waiting for an onlooker", tone: "text-muted-foreground" },
  claimed: { label: "Claimed — being filmed", tone: "text-foreground" },
  submitted: { label: "Footage in — needs your review", tone: "text-signal" },
  disputed: { label: "Under review", tone: "text-destructive" },
  completed: { label: "Completed and paid out", tone: "text-foreground" },
  expired: { label: "Expired — credits refunded", tone: "text-muted-foreground" },
};

/** Minimal shape the shared footage dialog needs for one of these bounties. */
function asLiveRequest(row: PostedBountyRow): LiveRequest {
  return {
    id: `db-${row.id}`,
    dbId: row.id,
    title: row.prompt,
    place: row.locationName,
    locationType: row.locationType ?? undefined,
    note: row.details,
    instructions: row.details,
    bounty: row.bounty,
    status: row.stage === "completed" ? "fulfilled" : row.stage === "expired" ? "expired" : "open",
    minutesAgo: 0,
    watchers: 1,
    responses: row.submissionCount,
    expiresInMin: 0,
    expiresAt: new Date(row.expiresAt).getTime(),
    requester: "you",
    x: 500,
    y: 500,
  } as LiveRequest;
}

export function PosterBountyDashboard() {
  const { user } = useAuth();
  const [rows, setRows] = useState<PostedBountyRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<TabId>("open");
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listMyPostedBounties());
    } catch {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else setRows([]);
  }, [user, refresh]);

  const totals = useMemo(() => {
    const open = rows.filter((r) => r.stage === "open").length;
    const working = rows.filter((r) =>
      ["claimed", "submitted", "disputed"].includes(r.stage),
    ).length;
    const held = rows
      .filter((r) => r.escrowStatus === "held" || r.escrowStatus === "reserved" || r.escrowStatus === "submitted" || r.escrowStatus === "disputed")
      .reduce((sum, r) => sum + r.escrowAmount, 0);
    const paid = rows.reduce((sum, r) => sum + r.payoutAmount, 0);
    const refunded = rows
      .filter((r) => r.stage === "expired")
      .reduce((sum, r) => sum + r.bounty, 0);
    return { open, working, held, paid, refunded };
  }, [rows]);

  const stats = [
    { icon: Radio, label: "Open", value: String(totals.open), show: totals.open > 0 },
    { icon: Camera, label: "In progress", value: String(totals.working), show: totals.working > 0 },
    { icon: Lock, label: "In escrow", value: formatCredits(totals.held), show: totals.held > 0 },
    { icon: BadgeDollarSign, label: "Paid out", value: formatCredits(totals.paid), show: totals.paid > 0 },
    { icon: Clock, label: "Refunded", value: formatCredits(totals.refunded), show: totals.refunded > 0 },
  ].filter((s) => s.show);

  const active = TABS.find((t) => t.id === tab) ?? TABS[0]!;
  const visible = rows.filter((r) => active.stages.includes(r.stage));

  async function cancel(row: PostedBountyRow) {
    setCancellingId(row.id);
    try {
      const balance = await refundBounty(row.id);
      toast.success("Bounty cancelled", {
        description: `${formatCredits(row.bounty)} refunded, wallet balance ${Math.round(balance)} Credits.`,
      });
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not cancel that bounty.");
    } finally {
      setCancellingId(null);
    }
  }

  if (!user) return null;

  return (
    <section className="mt-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-lg text-foreground">
          Your <span className="text-signal">bounty</span> dashboard
        </h2>
        {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        Everything you posted, who's working it, and where your credits ended up.
      </p>

      {stats.length > 0 && (
        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="rounded-2xl border border-border bg-surface p-3">
              <Icon className="size-4 text-muted-foreground" />
              <div className="mt-1.5 font-display text-lg text-signal">{value}</div>
              <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div role="tablist" aria-label="Bounty dashboard views" className="mt-4 flex overflow-hidden rounded-xl border border-border">
        {TABS.map((t) => {
          const count = rows.filter((r) => t.stages.includes(r.stage)).length;
          const selected = t.id === tab;
          return (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setTab(t.id)}
              className={`flex-1 px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                selected
                  ? "bg-signal text-signal-foreground"
                  : "bg-surface text-muted-foreground hover:text-foreground"
              }`}
            >
              {t.label}
              {count > 0 && <span className="ml-1.5 opacity-70">{count}</span>}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {visible.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground md:col-span-2 xl:col-span-3">
            {EMPTY[tab]}
          </p>
        ) : (
          visible.map((row) => {
            const spot = locationTypeById(row.locationType);
            const stage = STAGE_COPY[row.stage];
            return (
              <article
                key={row.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <p className="line-clamp-2 text-sm font-semibold text-foreground">{row.prompt}</p>
                <p className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3.5" />
                  <span className="truncate">{row.locationName}</span>
                  {spot && (
                    <span className="rounded-full border border-border px-2 py-0.5">
                      {spot.emoji} {spot.label}
                    </span>
                  )}
                </p>

                <p className={`mt-2 flex items-center gap-1.5 text-xs ${stage.tone}`}>
                  {row.stage === "disputed" ? (
                    <Gavel className="size-3.5" />
                  ) : (
                    <Clock className="size-3.5" />
                  )}
                  {stage.label} · {formatAgoISO(row.createdAt)}
                </p>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <div className="text-xs text-muted-foreground">
                    <span className="font-display text-base text-signal">
                      {formatCredits(row.payoutAmount > 0 ? row.payoutAmount : row.bounty)}
                    </span>{" "}
                    <span>
                      {formatCreditCash(row.payoutAmount > 0 ? row.payoutAmount : row.bounty)} ·{" "}
                      {row.payoutAmount > 0
                        ? "paid to the onlooker"
                        : row.stage === "expired"
                          ? "refunded to you"
                          : "held in escrow"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {row.stage === "open" && (
                      <button
                        type="button"
                        disabled={cancellingId === row.id}
                        onClick={() => void cancel(row)}
                        className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
                      >
                        {cancellingId === row.id ? "Refunding…" : "Cancel"}
                      </button>
                    )}
                    <BountyVideoDialog request={asLiveRequest(row)}>
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                          row.stage === "submitted"
                            ? "bg-signal text-signal-foreground"
                            : "border border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <Video className="size-3.5" />
                        {row.stage === "submitted" ? "Review" : "Footage"}
                        {row.submissionCount > 0 && ` ${row.submissionCount}`}
                      </button>
                    </BountyVideoDialog>
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}
