// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

import { listRiskFlags, resolveRiskFlag, type RiskFlag } from "@/lib/admin";

const SIGNAL_LABELS: Record<string, string> = {
  same_account: "Same account on both sides",
  shared_payout_account: "Same bank/payout destination",
  shared_ip: "Same network address",
  shared_device: "Same device",
};

function describe(signals: Record<string, unknown>): string[] {
  return Object.keys(signals).map((key) => SIGNAL_LABELS[key] ?? key);
}

/** Bounties where the payer and the person paid look like the same person. */
export function RiskFlagQueue() {
  const [rows, setRows] = useState<RiskFlag[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listRiskFlags().catch(() => [] as RiskFlag[]));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  async function decide(row: RiskFlag, status: "cleared" | "confirmed") {
    setBusyId(row.id);
    try {
      await resolveRiskFlag(row.id, status);
      toast.success(status === "cleared" ? "Marked as fine." : "Marked as self-dealing.");
      await refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Couldn't update that review item.");
    } finally {
      setBusyId(null);
    }
  }

  const open = rows.filter((r) => r.status === "open");

  return (
    <section className="mt-8">
      <h2 className="flex items-center gap-2 font-display text-lg text-foreground">
        <ShieldAlert className="size-4 text-signal" /> Possible self-dealing
      </h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Bounties where the person paying and the person paid share a payout destination, network or
        device. Earnings stay parked for 7 days until reviewed.
      </p>

      {loading && <p className="mt-3 text-sm text-muted-foreground">Loading…</p>}

      {!loading && open.length === 0 && (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nothing to review.
        </p>
      )}

      <div className="mt-3 space-y-3">
        {open.map((row) => (
          <article key={row.id} className="rounded-2xl border border-border bg-surface p-4">
            <p className="font-display text-base text-foreground">
              {row.payer_name ?? "Member"} paid {row.payee_name ?? "Member"}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {new Date(row.created_at).toLocaleString()}
            </p>
            <ul className="mt-2 space-y-1 text-sm text-foreground">
              {describe(row.signals).map((label) => (
                <li key={label}>• {label}</li>
              ))}
            </ul>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => void decide(row, "cleared")}
                className="flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground disabled:opacity-50"
              >
                {busyId === row.id ? <Loader2 className="size-3.5 animate-spin" /> : null} Looks fine
              </button>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => void decide(row, "confirmed")}
                className="rounded-xl bg-signal px-3 py-2.5 text-xs font-semibold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
              >
                Confirm self-dealing
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
