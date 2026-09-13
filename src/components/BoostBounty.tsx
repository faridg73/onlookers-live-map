import { useState } from "react";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useBoosts } from "@/lib/boosts-store";
import { BOOST_AMOUNTS } from "@/lib/boosts";

/** Small chip-in control so anyone can top up someone else's bounty pool. */
export function BoostBounty({ requestId, disabled }: { requestId: string; disabled?: boolean }) {
  const { user } = useAuth();
  const { boost } = useBoosts();
  const [pending, setPending] = useState<number | null>(null);

  async function chipIn(amount: number) {
    if (!user) {
      toast.error("Sign in to chip in on this bounty.");
      return;
    }
    setPending(amount);
    try {
      await boost(requestId, amount);
      toast.success(`You added ${amount} LC to the pool.`);
    } catch {
      toast.error("Couldn't add to this bounty.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex items-center gap-1.5">
      {BOOST_AMOUNTS.map((amount) => (
        <button
          key={amount}
          type="button"
          disabled={disabled || pending !== null}
          onClick={(e) => {
            e.stopPropagation();
            void chipIn(amount);
          }}
          className="inline-flex items-center gap-1 rounded-full border border-signal/50 bg-signal/10 px-2.5 py-1.5 text-xs font-semibold text-signal transition-colors hover:bg-signal/20 disabled:opacity-40"
          aria-label={`Chip in ${amount} Looker Coins to this bounty`}
        >
          {pending === amount ? (
            <Loader2 className="size-3 animate-spin" />
          ) : (
            <Plus className="size-3" />
          )}
          {amount} LC
        </button>
      ))}
    </div>
  );
}
