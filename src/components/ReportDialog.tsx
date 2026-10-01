// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REPORT_REASONS, reportContent } from "@/lib/community";

/** Report sheet for a post or clip; reports land in the staff review queue. */
export function ReportDialog({
  target,
  onClose,
}: {
  target: { kind: "post" | "clip"; id: string } | null;
  onClose: () => void;
}) {
  const [reason, setReason] = useState<string>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  if (!target) return null;

  const submit = async () => {
    setBusy(true);
    try {
      await reportContent(target.kind, target.id, reason, details);
      toast.success(`Thanks — our team will review this ${target.kind}.`);
      setDetails("");
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send that report.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 sm:items-center" onClick={onClose}>
      <div
        className="w-full max-w-md rounded-t-3xl border border-border bg-surface p-5 pb-[max(1.25rem,calc(env(safe-area-inset-bottom)+1rem))] sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-lg font-extrabold text-foreground">Report this {target.kind}</h2>
        <p className="mt-1 text-xs text-muted-foreground">Reports are private and reviewed by our team.</p>
        <div className="mt-4 space-y-2">
          {REPORT_REASONS.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setReason(r.id)}
              className={`w-full rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
                reason === r.id ? "border-signal bg-signal/10 text-signal" : "border-border text-foreground"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Anything else we should know? (optional)"
          className="mt-3 w-full rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm text-foreground outline-none focus:border-signal"
        />
        <div className="mt-4 flex gap-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
          <Button type="button" className="flex-1" disabled={busy} onClick={() => void submit()}>
            {busy ? "Sending…" : "Send report"}
          </Button>
        </div>
      </div>
    </div>
  );
}
