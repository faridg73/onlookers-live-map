// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { Check, Loader2, Mail, RotateCcw } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { formatLedgerWhen } from "@/lib/wallet-ledger";

type Ticket = {
  id: string;
  name: string | null;
  email: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
};

/** Dispute messages sent through the Contact form, for moderators to work through. */
export function DisputeMessagesInbox() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [showClosed, setShowClosed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    let q = supabase
      .from("support_tickets")
      .select("id, name, email, subject, message, status, created_at")
      .ilike("subject", "%dispute%")
      .order("created_at", { ascending: false })
      .limit(100);
    if (!showClosed) q = q.eq("status", "open");
    const { data } = await q;
    setTickets((data ?? []) as Ticket[]);
    setLoading(false);
  }, [showClosed]);

  useEffect(() => {
    void load();
  }, [load]);

  async function setStatus(id: string, status: "open" | "resolved") {
    setBusy(id);
    const { error } = await supabase.from("support_tickets").update({ status }).eq("id", id);
    setBusy(null);
    if (error) {
      toast.error("Couldn't update that message.");
      return;
    }
    toast.success(status === "resolved" ? "Marked as resolved." : "Reopened.");
    void load();
  }

  return (
    <section className="mt-6 rounded-2xl border border-border bg-surface p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Mail className="size-4 text-signal" />
          <h2 className="font-display text-base text-foreground">Dispute messages</h2>
          <span className="rounded-full border border-border px-2 py-0.5 text-[0.65rem] text-muted-foreground">
            {tickets.length}
          </span>
        </div>
        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={showClosed}
            onChange={(e) => setShowClosed(e.target.checked)}
            className="accent-[var(--signal)]"
          />
          Show resolved
        </label>
      </div>

      {loading ? (
        <p className="mt-4 text-sm text-muted-foreground">Loading messages…</p>
      ) : tickets.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No dispute messages waiting.</p>
      ) : (
        <ul className="mt-3 divide-y divide-border/60">
          {tickets.map((t) => (
            <li key={t.id} className="py-3">
              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">{t.name || "No name"}</span>
                <a href={`mailto:${t.email}`} className="underline underline-offset-4 hover:text-signal">
                  {t.email}
                </a>
                <span>· {formatLedgerWhen(t.created_at)}</span>
                <span
                  className={
                    "ml-auto rounded-full px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.12em] " +
                    (t.status === "open" ? "border border-signal/60 text-signal" : "border border-border")
                  }
                >
                  {t.status === "open" ? "Open" : "Resolved"}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-foreground">{t.message}</p>
              <div className="mt-2 flex gap-2">
                {t.status === "open" ? (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setStatus(t.id, "resolved")}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full bg-signal px-3 text-xs font-semibold text-signal-foreground disabled:opacity-50"
                  >
                    {busy === t.id ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />}
                    Mark resolved
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={busy !== null}
                    onClick={() => setStatus(t.id, "open")}
                    className="inline-flex min-h-9 cursor-pointer items-center gap-1.5 rounded-full border border-border px-3 text-xs font-semibold text-foreground disabled:opacity-50"
                  >
                    <RotateCcw className="size-3.5" /> Reopen
                  </button>
                )}
                <a
                  href={`mailto:${t.email}?subject=${encodeURIComponent("Re: your Onlooker dispute")}`}
                  className="inline-flex min-h-9 items-center rounded-full border border-border px-3 text-xs font-semibold text-foreground hover:border-signal/60"
                >
                  Reply by email
                </a>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
