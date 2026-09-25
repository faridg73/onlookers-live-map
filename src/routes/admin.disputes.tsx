// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gavel, Loader2, Play, ShieldCheck, UserCog, Video } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { DisputeMessagesInbox } from "@/components/admin/DisputeMessagesInbox";
import {
  isReviewStaff,
  listDisputesDetailed,
  listDisputeHistory,
  listEvidence,
  resolveDispute,
  resolveDisputeSplit,
  setModerator,
  type DetailedDisputeCase,
  type DisputeEvidence,
  type PastDisputeRuling,
} from "@/lib/disputes";
import { locationTypeById } from "@/lib/onlooker";
import {
  listVideosForRequest,
  playbackUrl,
  type BountyVideo,
} from "@/lib/bounty-videos";
import { disputeReasonLabel } from "@/lib/moderation-reasons";
import { getPosterDisputeStats, type DisputeStats } from "@/lib/bounty-review";


export const Route = createFileRoute("/admin/disputes")({
  head: () => ({
    meta: [
      { title: "Onlooker moderator dashboard, dispute review" },
      {
        name: "description",
        content:
          "Moderator tools for Onlooker: review disputed bounties, watch the submitted clips, read evidence, and release or refund the escrowed payout.",
      },
      { property: "og:title", content: "Onlooker moderator dashboard" },
      {
        property: "og:description",
        content: "Review disputed bounties and settle escrow payouts fairly.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ModeratorDashboard,
});

function ModeratorDashboard() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<boolean | null>(null);
  const [cases, setCases] = useState<DetailedDisputeCase[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCases(await listDisputesDetailed());
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let alive = true;
    if (!user) {
      setStaff(false);
      setLoading(false);
      return;
    }
    void (async () => {
      const ok = await isReviewStaff();
      if (!alive) return;
      setStaff(ok);
      if (ok) await refresh();
      else setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [user, refresh]);

  if (!user || staff === false) {
    return (
      <main className="reading-shell pb-32 pt-16 text-center">
        <ShieldCheck className="mx-auto size-8 text-signal" />
        <h1 className="mt-4 font-display text-2xl text-foreground">Moderators only</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This dashboard is for designated Onlooker moderators.
        </p>
        <Link
          to={user ? "/disputes" : "/auth"}
          className="mt-6 inline-flex rounded-full bg-signal px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground"
        >
          {user ? "Your disputes" : "Sign in"}
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-7xl px-4 pb-32 pt-8 sm:px-6 lg:px-8">
      <header className="flex items-start gap-3">
        <Gavel className="mt-1 size-6 text-signal" />
        <div>
          <h1 className="font-display text-2xl text-foreground">Dispute review</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Newest first. Read the original bounty, watch the submission, then release the full
            payout, refund the poster, or settle a kill-fee split. The escrow stays locked until you
            decide.
          </p>
        </div>
      </header>

      <ModeratorAdmin />
      <DisputeMessagesInbox />

      {loading && <p className="mt-8 text-center text-sm text-muted-foreground">Loading cases…</p>}
      {!loading && cases.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No open disputes right now.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {cases.map((c) => (
          <ReviewCase key={c.request_id} item={c} onResolved={refresh} />
        ))}
      </div>
    </main>
  );
}

/** Admins can hand the moderator badge to another account by email. */
function ModeratorAdmin() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  async function apply(enabled: boolean) {
    const target = email.trim();
    if (!target) return;
    setBusy(true);
    try {
      await setModerator(target, enabled);
      toast.success(enabled ? `${target} is now a moderator.` : `${target} is no longer a moderator.`);
      setEmail("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't change that role.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <p className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
        <UserCog className="size-3.5" /> Moderator accounts (admins only)
      </p>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="person@email.com"
        className="mt-3 w-full rounded-2xl border border-border bg-surface-raised px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
      />
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void apply(true)}
          className="rounded-xl bg-signal px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
        >
          Make moderator
        </button>
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void apply(false)}
          className="rounded-xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground disabled:opacity-50"
        >
          Remove
        </button>
      </div>
    </section>
  );
}

function ReviewCase({ item, onResolved }: { item: DetailedDisputeCase; onResolved: () => void }) {
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<DisputeEvidence[]>([]);
  const [clips, setClips] = useState<BountyVideo[]>([]);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
  const [ruling, setRuling] = useState(false);
  const [killFee, setKillFee] = useState(25);
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<PastDisputeRuling[]>([]);
  const [posterRate, setPosterRate] = useState<DisputeStats | null>(null);
  const noteReady = note.trim().length >= 10;
  const spot = locationTypeById(item.location_type);

  const load = useCallback(async () => {
    const [ev, vids, past, rate] = await Promise.all([
      listEvidence(item.request_id).catch(() => []),
      listVideosForRequest(item.request_id).catch(() => [] as BountyVideo[]),
      listDisputeHistory(item.requester_id, item.spotter_id).catch(
        () => [] as PastDisputeRuling[],
      ),
      getPosterDisputeStats(item.requester_id).catch(() => null),
    ]);
    setEntries(ev);
    setClips(vids as BountyVideo[]);
    setHistory(past);
    setPosterRate(rate);
  }, [item.request_id, item.requester_id, item.spotter_id]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);


  async function watch(clip: BountyVideo) {
    try {
      setPlaying({ id: clip.id, url: await playbackUrl(clip.storage_path) });
    } catch {
      toast.error("Couldn't open that clip.");
    }
  }

  async function decide(awardSpotter: boolean) {
    setRuling(true);
    try {
      await resolveDispute(item.request_id, awardSpotter, note);
      toast.success(
        awardSpotter ? "Payout released to the reporter." : "Bounty refunded to the poster.",
      );
      onResolved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't settle this dispute.");
    } finally {
      setRuling(false);
    }
  }

  async function splitDecision() {
    setRuling(true);
    try {
      await resolveDisputeSplit(item.request_id, killFee, note);
      toast.success(`Split settled — ${killFee}% kill fee to the reporter, rest refunded.`);
      onResolved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't settle this dispute.");
    } finally {
      setRuling(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <button type="button" onClick={() => setOpen(!open)} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base text-foreground">{item.prompt}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {item.location_name}
              {spot ? ` · ${spot.emoji} ${spot.label}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold text-signal">
            ${item.amount.toFixed(2)} held
          </span>
        </div>
        <p className="mt-3 rounded-xl bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
          <span className="font-semibold text-foreground">{disputeReasonLabel(item.reason_code ?? "")}</span>
          {item.dispute_reason ? ` · ${item.dispute_reason}` : ""}
        </p>
        <p className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
          {item.evidence_count} evidence {item.evidence_count === 1 ? "entry" : "entries"} ·{" "}
          {item.disputed_at ? new Date(item.disputed_at).toLocaleString() : "-"} ·{" "}
          {open ? "Hide" : "Review"}
        </p>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
          {posterRate && posterRate.reviewed > 0 && (
            <p
              className={`rounded-xl px-3 py-2 text-xs font-semibold ${
                posterRate.rate >= 40
                  ? "bg-destructive/15 text-destructive"
                  : "bg-surface-raised text-muted-foreground"
              }`}
            >
              Poster report rate: {posterRate.rate}% ({posterRate.disputed} of{" "}
              {posterRate.reviewed} bounties reported)
            </p>
          )}
          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
            Original bounty
          </p>

          <div className="rounded-xl bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
            <p className="text-sm text-foreground">{item.prompt}</p>
            {item.details && <p className="mt-1 whitespace-pre-wrap">{item.details}</p>}
            <p className="mt-2">
              {item.category ? `${item.category} · ` : ""}
              {spot ? `${spot.emoji} ${spot.label}` : "No location type declared"}
            </p>
            {item.checklist.length > 0 && (
              <ul className="mt-2 list-disc space-y-0.5 pl-4">
                {item.checklist.map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            )}
          </div>

          <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
            Submitted clips
          </p>
          {clips.length === 0 && (
            <p className="text-xs text-muted-foreground">No clips attached to this bounty.</p>
          )}
          {clips.map((c) => (
            <div key={c.id} className="rounded-xl bg-surface-raised p-3">
              <div className="flex items-center gap-3">
                <Video className="size-4 shrink-0 text-signal" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">{c.note || "Bounty clip"}</p>
                  <p className="text-[0.68rem] text-muted-foreground">
                    {new Date(c.created_at).toLocaleString()}
                    {c.duration_seconds ? ` · ${c.duration_seconds}s` : ""}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void watch(c)}
                  className="flex items-center gap-1.5 rounded-full bg-signal px-3 py-1.5 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-signal-foreground"
                >
                  <Play className="size-3" /> Watch
                </button>
              </div>
              {playing?.id === c.id && (
                <video
                  src={playing.url}
                  controls
                  playsInline
                  autoPlay
                  className="mt-3 w-full rounded-xl bg-black"
                />
              )}
            </div>
          ))}

          <p className="pt-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
            Evidence log
          </p>
          {entries.length === 0 && (
            <p className="text-xs text-muted-foreground">No evidence submitted yet.</p>
          )}
          {entries.map((e) => (
            <div key={e.id} className="rounded-xl bg-surface-raised px-3 py-2">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-signal">{e.role}</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">{e.body}</p>
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                {new Date(e.created_at).toLocaleString()}
              </p>
            </div>
          ))}

          {history.length > 0 && (
            <div className="rounded-xl border border-border bg-surface-raised px-3 py-2.5">
              <p className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                Earlier rulings involving these accounts
              </p>
              <ul className="mt-2 space-y-2">
                {history.map((h) => (
                  <li key={h.id} className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {h.outcome === "payout"
                        ? "Paid the onlooker"
                        : h.outcome === "refund"
                          ? "Refunded the poster"
                          : `Split ${h.spotter_pct}% to the onlooker`}
                    </span>{" "}
                    · {h.side === "poster" ? "same poster" : h.side === "onlooker" ? "same onlooker" : "both parties"}{" "}
                    · {new Date(h.created_at).toLocaleDateString()}
                    <span className="block truncate text-[0.68rem]">{h.prompt}</span>
                    <span className="block whitespace-pre-wrap text-[0.7rem] italic">{h.note}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="pt-2">
            <label
              htmlFor={`note-${item.request_id}`}
              className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground"
            >
              Your reasoning (required, kept on the record)
            </label>
            <textarea
              id={`note-${item.request_id}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Why you settled it this way — both sides can be shown this later."
              className="mt-1.5 w-full rounded-xl border border-border bg-surface px-3 py-2 text-sm text-foreground outline-none focus:border-signal"
            />
            {!noteReady && (
              <p className="mt-1 text-[0.68rem] text-muted-foreground">
                Write at least 10 characters before settling.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-2">
            <button
              type="button"
              disabled={ruling || !noteReady}
              onClick={() => void decide(true)}
              className="flex items-center justify-center gap-2 rounded-xl bg-signal px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
            >
              {ruling ? <Loader2 className="size-3.5 animate-spin" /> : null} Release payout
            </button>
            <button
              type="button"
              disabled={ruling || !noteReady}
              onClick={() => void decide(false)}
              className="rounded-xl border border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground disabled:opacity-50"
            >
              Refund poster
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 rounded-xl bg-surface-raised px-3 py-2.5">
            <span className="text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
              Kill fee split
            </span>
            <input
              type="number"
              min={1}
              max={99}
              value={killFee}
              onChange={(e) => setKillFee(Math.min(99, Math.max(1, Number(e.target.value) || 1)))}
              className="w-16 rounded-lg border border-border bg-surface px-2 py-1 text-sm text-foreground outline-none focus:border-signal"
            />
            <span className="text-xs text-muted-foreground">
              % to the reporter (${((item.amount * killFee) / 100).toFixed(2)}), rest refunded
            </span>
            <button
              type="button"
              disabled={ruling || !noteReady}
              onClick={() => void splitDecision()}
              className="ml-auto rounded-xl border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground disabled:opacity-50"
            >
              Settle split
            </button>
          </div>
        </div>
      )}
    </article>
  );
}
