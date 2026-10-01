// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { REPORT_REASONS, listContentReports, resolveContentReport, type AdminContentReport } from "@/lib/community";

const reasonLabel = (id: string) => REPORT_REASONS.find((r) => r.id === id)?.label ?? id;

/** Staff queue for user reports on posts: remove, restore or dismiss. */
export function ContentReportsQueue() {
  const [rows, setRows] = useState<AdminContentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setRows(await listContentReports());
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't load reports.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const act = async (row: AdminContentReport, action: "dismiss" | "remove" | "restore" | "suspend" | "unsuspend") => {
    setBusy(row.id);
    try {
      await resolveContentReport(row.id, action);
      const what = row.kind === "clip" ? "Clip" : "Post";
      toast.success({ remove: `${what} removed.`, restore: `${what} restored.`, dismiss: "Report dismissed.", suspend: "Account suspended.", unsuspend: "Account unsuspended." }[action]);
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update that report.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <section className="mt-10">
      <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
        <Flag className="size-4 text-signal" /> Reported posts & clips
      </h2>
      {!loading && rows.length === 0 && (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          No reports.
        </p>
      )}
      <div className="mt-3 space-y-3">
        {rows.map((row) => (
          <article key={row.id} className="rounded-2xl border border-border bg-surface p-4">
            <div className="flex items-center justify-between gap-2">
              <p className="font-display text-base text-foreground"><span className="mr-2 text-[0.65rem] uppercase text-muted-foreground">{row.kind}</span>{row.post_title}</p>
              <span className="rounded-full bg-surface-raised px-2.5 py-1 text-[0.65rem] font-semibold uppercase text-urgent">
                {row.status}{row.post_hidden ? " · hidden" : ""}
              </span>
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              By {row.author_name} · reported by {row.reporter_name} · {row.report_count} report{row.report_count === 1 ? "" : "s"} · {new Date(row.created_at).toLocaleString()}
            </p>
            <span className="mt-2 inline-flex rounded-full border border-border px-2.5 py-1 text-[0.65rem] font-semibold text-foreground">
              {reasonLabel(row.reason)}
            </span>
            {row.post_body && <p className="mt-2 rounded-xl bg-surface-raised px-3 py-2 text-xs text-muted-foreground">{row.post_body}</p>}
            {row.details && <p className="mt-2 text-xs italic text-muted-foreground">“{row.details}”</p>}
            <div className="mt-3 flex flex-wrap gap-2">
              {row.post_hidden ? (
                <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row, "restore")}>Restore {row.kind}</Button>
              ) : (
                <Button size="sm" variant="destructive" disabled={busy === row.id} onClick={() => void act(row, "remove")}>Remove {row.kind}</Button>
              )}
              {row.author_suspended ? (
                <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row, "unsuspend")}>Unsuspend account</Button>
              ) : (
                <Button size="sm" variant="destructive" disabled={busy === row.id} onClick={() => { if (window.confirm(`Suspend ${row.author_name}'s account?`)) void act(row, "suspend"); }}>Suspend account</Button>
              )}
              {row.status !== "dismissed" && (
                <Button size="sm" variant="outline" disabled={busy === row.id} onClick={() => void act(row, "dismiss")}>Dismiss</Button>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
