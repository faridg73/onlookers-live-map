import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BadgeDollarSign, Landmark, Receipt } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { CoinPayoutDashboard } from "@/components/CoinPayoutDashboard";
import { listMyVideos, type BountyVideo } from "@/lib/bounty-videos";

export const Route = createFileRoute("/payout-history")({
  head: () => ({
    meta: [
      { title: "Payout History — Onlooker" },
      {
        name: "description",
        content: "Every accepted clip, the platform fee, and the payout that landed in your wallet.",
      },
      { property: "og:title", content: "Onlooker Payout History" },
      { property: "og:description", content: "Track each accepted clip payout and fee." },
    ],
  }),
  component: PayoutHistoryScreen,
});

const money = (n: number) => `$${n.toFixed(2)}`;

function PayoutHistoryScreen() {
  const { user, loading } = useAuth();
  const [payouts, setPayouts] = useState<BountyVideo[]>([]);

  const refresh = useCallback(async () => {
    try {
      const rows = await listMyVideos();
      setPayouts(
        rows
          .filter((v) => v.accepted_at && v.payout_amount > 0)
          .sort(
            (a, b) =>
              new Date(b.accepted_at as string).getTime() -
              new Date(a.accepted_at as string).getTime(),
          ),
      );
    } catch {
      setPayouts([]);
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else setPayouts([]);
  }, [user, refresh]);

  const totalEarned = payouts.reduce((sum, v) => sum + v.payout_amount, 0);
  const totalFees = payouts.reduce(
    (sum, v) => sum + Math.max(0, v.bounty_amount - v.payout_amount),
    0,
  );

  return (
    <div className="mx-auto max-w-lg px-4 pb-28 pt-6">
      <Link
        to="/profile"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
      >
        <ArrowLeft className="size-4" /> Profile
      </Link>

      <h1 className="mt-3 font-display text-2xl tracking-tight text-foreground">
        Payout history
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Every accepted clip, the 15% platform fee, and the cash that landed in your wallet.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-border bg-surface p-4">
          <BadgeDollarSign className="size-4 text-signal" />
          <div className="mt-2 font-display text-xl text-foreground">{money(totalEarned)}</div>
          <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
            Earned
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface p-4">
          <Receipt className="size-4 text-signal" />
          <div className="mt-2 font-display text-xl text-foreground">{money(totalFees)}</div>
          <div className="text-[0.6rem] uppercase tracking-[0.16em] text-muted-foreground">
            Platform fees
          </div>
        </div>
      </div>

      {user ? <CoinPayoutDashboard /> : null}

      <h2 className="mt-8 text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        Accepted clips
      </h2>

      <div className="mt-3 space-y-3">
        {loading ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Loading your payouts…
          </p>
        ) : !user ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            Sign in to see your payout history.
          </p>
        ) : payouts.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
            No payouts yet — get a clip accepted to earn your first bounty.
          </p>
        ) : (
          payouts.map((v) => {
            const fee = Math.max(0, v.bounty_amount - v.payout_amount);
            return (
              <div
                key={v.id}
                className="rounded-2xl border border-border bg-surface p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {v.request_title}
                    </p>
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                      {v.request_place}
                    </p>
                  </div>
                  <div className="shrink-0 rounded-full bg-signal px-3 py-1 font-display text-sm text-signal-foreground">
                    +{money(v.payout_amount)}
                  </div>
                </div>
                <div className="mt-3 space-y-1 border-t border-border pt-3 text-xs text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Bounty</span>
                    <span className="text-foreground">{money(v.bounty_amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Platform fee</span>
                    <span>−{money(fee)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="inline-flex items-center gap-1">
                      <Landmark className="size-3.5" /> Landed in wallet
                    </span>
                    <span className="text-foreground">
                      {new Date(v.accepted_at as string).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
