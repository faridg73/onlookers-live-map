import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gavel, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import {
  addEvidence,
  isReviewStaff,
  listDisputes,
  listEvidence,
  resolveDispute,
  type DisputeCase,
  type DisputeEvidence,
} from "@/lib/disputes";

export const Route = createFileRoute("/disputes")({
  head: () => ({
    meta: [
      { title: "Onlooker Disputes — submit evidence & get a ruling" },
      {
        name: "description",
        content:
          "Track disputed Onlooker bounties, add written evidence about a submitted clip, and see how the moderation team settles the escrowed payout.",
      },
      { property: "og:title", content: "Onlooker dispute center" },
      {
        property: "og:description",
        content: "Submit evidence on a disputed bounty and follow the moderator's payout decision.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: DisputesScreen,
});

function DisputesScreen() {
  const { user } = useAuth();
  const [cases, setCases] = useState<DisputeCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string | null>(null);
  const [staff, setStaff] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCases(await listDisputes());
    } catch {
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void refresh();
      void isReviewStaff().then(setStaff);
    } else {
      setStaff(false);
      setLoading(false);
    }
  }, [user, refresh]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 pb-28 pt-8">
      <header className="flex items-start gap-3">
        <ShieldAlert className="mt-1 size-6 text-signal" />
        <div>
          <h1 className="font-display text-2xl text-foreground">Dispute center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The bounty stays locked in escrow while a dispute is open. Add evidence here — a
            moderator reviews both sides and releases or refunds the money.
          </p>
        </div>
      </header>

      {staff && (
        <Link
          to="/admin/disputes"
          className="mt-5 flex items-center justify-center rounded-2xl border border-signal/40 bg-surface px-4 py-3 text-xs font-semibold uppercase tracking-[0.14em] text-signal"
        >
          Open moderator dashboard
        </Link>
      )}

      {!user && (
        <div className="mt-8 rounded-2xl border border-border bg-surface p-6 text-center">
          <p className="text-sm text-muted-foreground">Sign in to see your disputes.</p>
          <Link
            to="/auth"
            className="mt-4 inline-flex rounded-full bg-signal px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground"
          >
            Sign in
          </Link>
        </div>
      )}

      {user && loading && (
        <p className="mt-8 text-center text-sm text-muted-foreground">Loading disputes…</p>
      )}

      {user && !loading && cases.length === 0 && (
        <p className="mt-8 rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No open disputes. Flag a clip from its bounty to start one.
        </p>
      )}

      <div className="mt-6 space-y-4">
        {cases.map((c) => (
          <DisputeCard
            key={c.request_id}
            item={c}
            userId={user?.id ?? ""}
            open={selected === c.request_id}
            onToggle={() => setSelected(selected === c.request_id ? null : c.request_id)}
            onResolved={refresh}
          />
        ))}
      </div>
    </main>
  );
}

function DisputeCard({
  item,
  userId,
  open,
  onToggle,
  onResolved,
}: {
  item: DisputeCase;
  userId: string;
  open: boolean;
  onToggle: () => void;
  onResolved: () => void;
}) {
  const [entries, setEntries] = useState<DisputeEvidence[]>([]);
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [ruling, setRuling] = useState(false);

  const role = item.is_moderator && item.requester_id !== userId ? "moderator" : item.requester_id === userId ? "poster" : "reporter";

  const load = useCallback(async () => {
    try {
      setEntries(await listEvidence(item.request_id));
    } catch {
      setEntries([]);
    }
  }, [item.request_id]);

  useEffect(() => {
    if (open) void load();
  }, [open, load]);

  async function submit() {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    try {
      await addEvidence(item.request_id, text, role);
      setBody("");
      toast.success("Evidence added to this dispute.");
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save that evidence.");
    } finally {
      setBusy(false);
    }
  }

  async function decide(awardSpotter: boolean) {
    setRuling(true);
    try {
      await resolveDispute(item.request_id, awardSpotter);
      toast.success(awardSpotter ? "Payout released to the reporter." : "Bounty refunded to the poster.");
      onResolved();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't settle this dispute.");
    } finally {
      setRuling(false);
    }
  }

  return (
    <article className="rounded-2xl border border-border bg-surface p-4">
      <button type="button" onClick={onToggle} className="w-full text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="truncate font-display text-base text-foreground">{item.prompt}</h2>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{item.location_name}</p>
          </div>
          <span className="shrink-0 rounded-full bg-surface-raised px-3 py-1 text-xs font-semibold text-signal">
            ${item.amount.toFixed(2)} held
          </span>
        </div>
        <p className="mt-3 rounded-xl bg-surface-raised px-3 py-2 text-xs text-muted-foreground">
          Reason: {item.dispute_reason || "No reason given."}
        </p>
        <p className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
          {item.evidence_count} evidence {item.evidence_count === 1 ? "entry" : "entries"} ·{" "}
          {open ? "Hide" : "Open case"}
        </p>
      </button>

      {open && (
        <div className="mt-4 space-y-3 border-t border-border pt-4">
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

          <textarea
            value={body}
            onChange={(ev) => setBody(ev.target.value)}
            rows={3}
            placeholder="Describe what happened, link a timestamp, or explain your side."
            className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
          <button
            type="button"
            disabled={busy || !body.trim()}
            onClick={() => void submit()}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : null} Submit evidence
          </button>

          {item.is_moderator && (
            <div className="rounded-2xl border border-dashed border-border p-3">
              <p className="flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground">
                <Gavel className="size-3.5" /> Moderator decision
              </p>
              <div className="mt-3 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={ruling}
                  onClick={() => void decide(true)}
                  className="rounded-xl bg-signal px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
                >
                  Pay reporter
                </button>
                <button
                  type="button"
                  disabled={ruling}
                  onClick={() => void decide(false)}
                  className="rounded-xl border border-border px-3 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground disabled:opacity-50"
                >
                  Refund poster
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </article>
  );
}
