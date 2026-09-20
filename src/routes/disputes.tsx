// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { FileUp, Gavel, Loader2, ShieldAlert } from "lucide-react";
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
import { moderationReasonLabel } from "@/lib/moderation-reasons";
import {
  listEligibleDisputeBounties,
  openDisputeWithEvidence,
  type EligibleDisputeBounty,
} from "@/lib/dispute-filing.functions";
import { uploadMedia } from "@/lib/media-upload";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/disputes")({
  head: () => ({
    meta: [
      { title: "Onlooker Disputes, submit evidence & get a ruling" },
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
  const [eligible, setEligible] = useState<EligibleDisputeBounty[]>([]);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setCases(await listDisputes());
    } catch (error) {
      console.error("[disputes] failed to load cases", error);
      setCases([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      void refresh();
      void isReviewStaff().then(setStaff);
      void listEligibleDisputeBounties()
        .then(setEligible)
        .catch((error) => {
          console.error("[disputes] failed to load eligible bounties", error);
          setEligible([]);
        });
    } else {
      setStaff(false);
      setEligible([]);
      setLoading(false);
    }
  }, [user, refresh]);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-28 pt-[max(env(safe-area-inset-top),3rem)] sm:px-6 lg:px-8">
      <header className="flex items-start gap-3">
        <ShieldAlert className="mt-1 size-6 text-signal" />
        <div>
          <h1 className="font-display text-2xl text-foreground">Dispute center</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            The bounty stays locked in escrow while a dispute is open. Add evidence here, a
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

      {user && !loading && (
        <DisputeFilingForm
          userId={user.id}
          bounties={eligible}
          onSubmitted={async () => {
            await refresh();
            setEligible(await listEligibleDisputeBounties());
          }}
        />
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

const DISPUTE_REASONS = [
  { value: "failure_to_deliver", label: "Failure to Deliver" },
  { value: "quality_issue", label: "Quality Issue" },
  { value: "verification_mismatch", label: "Verification Mismatch" },
] as const;

function DisputeFilingForm({
  userId,
  bounties,
  onSubmitted,
}: {
  userId: string;
  bounties: EligibleDisputeBounty[];
  onSubmitted: () => Promise<void>;
}) {
  const [requestId, setRequestId] = useState("");
  const [reasonCode, setReasonCode] = useState<(typeof DISPUTE_REASONS)[number]["value"] | "">("");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const valid = Boolean(requestId && reasonCode && description.trim().length >= 10 && !busy);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!valid || !reasonCode) return;
    setBusy(true);
    setError("");
    let uploadedPath: string | null = null;
    try {
      if (file) {
        const extension = file.name.split(".").pop()?.replace(/[^A-Za-z0-9]/g, "").toLowerCase() || "bin";
        uploadedPath = `${userId}/${requestId}/${crypto.randomUUID()}.${extension}`;
        await uploadMedia({
          bucket: "dispute-evidence",
          path: uploadedPath,
          file,
          contentType: file.type,
        });
      }

      await openDisputeWithEvidence({
        data: {
          requestId,
          reasonCode,
          description: description.trim(),
          file: file && uploadedPath
            ? {
                storagePath: uploadedPath,
                fileName: file.name,
                fileType: file.type as "image/jpeg" | "image/png" | "image/webp" | "video/mp4" | "video/quicktime" | "video/webm" | "application/pdf",
                fileSize: file.size,
              }
            : null,
        },
      });
      toast.success("Dispute submitted. The bounty funds are now held for moderator review.");
      setRequestId("");
      setReasonCode("");
      setDescription("");
      setFile(null);
      await onSubmitted();
    } catch (cause) {
      if (uploadedPath) {
        await supabase.storage.from("dispute-evidence").remove([uploadedPath]).catch(() => undefined);
      }
      const message = cause instanceof Error ? cause.message : "Could not submit this dispute.";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="mt-8 border-y border-border py-6">
      <h2 className="font-display text-lg text-foreground">File a dispute</h2>
      {bounties.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">
          No submitted bounties are currently inside their review window.
        </p>
      ) : (
        <form className="mt-4 space-y-4" onSubmit={submit}>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Bounty</label>
            <Select value={requestId} onValueChange={setRequestId}>
              <SelectTrigger className="h-12 bg-surface"><SelectValue placeholder="Select a submitted bounty" /></SelectTrigger>
              <SelectContent>
                {bounties.map((bounty) => (
                  <SelectItem key={bounty.requestId} value={bounty.requestId}>
                    {bounty.prompt} · ${bounty.amount.toFixed(2)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">Reason</label>
            <Select value={reasonCode} onValueChange={(value) => setReasonCode(value as typeof reasonCode)}>
              <SelectTrigger className="h-12 bg-surface"><SelectValue placeholder="Choose a reason" /></SelectTrigger>
              <SelectContent>
                {DISPUTE_REASONS.map((reason) => <SelectItem key={reason.value} value={reason.value}>{reason.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label htmlFor="dispute-description" className="mb-1.5 block text-xs font-semibold uppercase text-muted-foreground">What happened?</label>
            <Textarea
              id="dispute-description"
              value={description}
              onChange={(event) => setDescription(event.target.value.slice(0, 3000))}
              minLength={10}
              maxLength={3000}
              rows={5}
              required
              placeholder="Describe the delivery, quality, or verification problem in detail."
              className="min-h-32 bg-surface"
            />
            <p className="mt-1 text-right text-xs text-muted-foreground">{description.length}/3000</p>
          </div>
          <div>
            <label htmlFor="dispute-file" className="mb-1.5 flex items-center gap-2 text-xs font-semibold uppercase text-muted-foreground">
              <FileUp className="size-4" /> Evidence file (optional)
            </label>
            <Input
              id="dispute-file"
              type="file"
              accept="image/jpeg,image/png,image/webp,video/mp4,video/quicktime,video/webm,application/pdf"
              className="h-12 bg-surface py-2"
              onChange={(event) => {
                const next = event.target.files?.[0] ?? null;
                if (next && next.size > 20 * 1024 * 1024) {
                  event.target.value = "";
                  setFile(null);
                  setError("Evidence files must be 20 MB or smaller.");
                  return;
                }
                setError("");
                setFile(next);
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">Photos, video, or PDF up to 20 MB. Evidence stays private.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" disabled={!valid} className="h-12 w-full uppercase">
            {busy ? <Loader2 className="size-4 animate-spin" /> : <Gavel className="size-4" />}
            Submit dispute to escrow
          </Button>
        </form>
      )}
    </section>
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
          <span className="font-semibold text-foreground">{moderationReasonLabel(item.reason_code ?? "")}</span>
          {item.dispute_reason ? ` · ${item.dispute_reason}` : ""}
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
