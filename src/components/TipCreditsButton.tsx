import { useState } from "react";
import { Gift } from "lucide-react";
import { toast } from "sonner";
import { formatCredits, tipCredits } from "@/lib/credits";

/** Peer-to-peer Credit tip presets (4 Credits = $1). */
export const TIP_PRESETS = [2, 4, 8, 20];

/** Sends Credits straight to another member; the platform keeps a small fee. */
export function TipCreditsButton({
  receiverId,
  receiverName,
  className,
}: {
  receiverId: string;
  receiverName?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = async (amount: number) => {
    setBusy(true);
    try {
      const res = await tipCredits({ receiverId, amount });
      toast.success(
        `Sent ${formatCredits(amount)}, ${receiverName ?? "they"} received ${formatCredits(res.amountNet)}.`,
      );
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't send that tip.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex items-center gap-1.5 rounded-xl border border-signal/60 bg-signal/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-signal"
      >
        <Gift className="size-4" /> Tip
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-border bg-surface-raised p-3">
          <p className="text-xs text-muted-foreground">
            Say thanks in Credits. A small platform fee is taken from each tip.
          </p>
          <div className="mt-2 flex gap-2">
            {TIP_PRESETS.map((amount) => (
              <button
                key={amount}
                type="button"
                disabled={busy}
                onClick={() => void send(amount)}
                className="flex-1 rounded-xl border border-signal/60 px-2 py-2 text-xs font-bold text-signal disabled:opacity-50"
              >
                {formatCredits(amount)}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
