import { Loader2, Receipt } from "lucide-react";

import {
  formatLedgerDollars,
  formatLedgerWhen,
  ledgerTypeLabel,
  type LedgerEntry,
} from "@/lib/wallet-ledger";

const STATUS_STYLES: Record<string, string> = {
  completed: "border-signal/40 bg-signal/10 text-signal",
  pending: "border-amber-400/40 bg-amber-400/10 text-amber-300",
  failed: "border-destructive/50 bg-destructive/10 text-destructive",
};

/** Full transaction history: timestamp, type, credit change, dollar value, status. */
export function TransactionLedgerTable({
  entries,
  loading = false,
}: {
  entries: LedgerEntry[];
  loading?: boolean;
}) {
  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-lg text-foreground">Transaction History &amp; Ledger</h3>
          <p className="text-xs text-muted-foreground">
            Every credit in and out of your wallet, with its dollar value.
          </p>
        </div>
        <Receipt className="size-4 text-signal" />
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> Loading your history…
        </p>
      ) : entries.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-border px-3 py-8 text-center text-xs text-muted-foreground">
          No transactions yet. Top-ups, tips and bounty payouts will appear here.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto rounded-2xl border border-border">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-surface">
              <tr className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
                <th className="px-3 py-2 font-medium">When</th>
                <th className="px-3 py-2 font-medium">Type</th>
                <th className="px-3 py-2 text-right font-medium">Credits</th>
                <th className="px-3 py-2 text-right font-medium">Value</th>
                <th className="px-3 py-2 text-right font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const incoming = entry.creditChange >= 0;
                return (
                  <tr key={entry.id} className="border-t border-border bg-surface-raised">
                    <td className="whitespace-nowrap px-3 py-2.5 text-xs text-muted-foreground">
                      {formatLedgerWhen(entry.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 text-foreground">{ledgerTypeLabel(entry.type)}</td>
                    <td
                      className={`whitespace-nowrap px-3 py-2.5 text-right font-display ${
                        incoming ? "text-signal" : "text-foreground"
                      }`}
                    >
                      {incoming ? "+" : "−"}
                      {Math.abs(entry.creditChange).toLocaleString()}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2.5 text-right text-xs text-muted-foreground">
                      {formatLedgerDollars(entry.dollarValue)}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      <span
                        className={`inline-flex rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold uppercase tracking-[0.1em] ${
                          STATUS_STYLES[entry.status] ?? "border-border bg-surface text-muted-foreground"
                        }`}
                      >
                        {entry.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
