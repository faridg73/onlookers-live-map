// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Loader2, Receipt } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { CreditWalletCard } from "@/components/CreditWalletCard";
import { BuyCreditsCard } from "@/components/BuyCreditsCard";
import { CreditPayoutDashboard } from "@/components/CreditPayoutDashboard";
import { MyEarningsCard } from "@/components/MyEarningsCard";
import { creditPackageById } from "@/lib/credit-packages";
import { InlineSignIn } from "@/components/InlineSignIn";
import { PageBackButton } from "@/components/PageBackButton";

export const Route = createFileRoute("/balance")({
  head: () => ({
    meta: [
      { title: "Balance & Cashout | Onlooker LLC" },
      {
        name: "description",
        content:
          "See your Onlooker LLC credit balance, every credit pack you bought, and cash your credits out to your bank.",
      },
      { property: "og:title", content: "Balance & Cashout | Onlooker LLC" },
      {
        property: "og:description",
        content: "Credits balance, purchase history and bank cash out in one place.",
      },
    ],
  }),
  component: BalanceScreen,
});

type Purchase = {
  id: string;
  packageId: string;
  credits: number;
  amountCents: number;
  createdAt: string;
};

async function listCreditPurchases(limit = 25): Promise<Purchase[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];

  const { data, error } = await supabase
    .from("credit_purchases")
    .select("id, package_id, credits, amount_cents, created_at")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id,
    packageId: row.package_id,
    credits: row.credits,
    amountCents: row.amount_cents,
    createdAt: row.created_at,
  }));
}

function BalanceScreen() {
  const { user, loading } = useAuth();
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingPurchases, setLoadingPurchases] = useState(true);

  const refresh = useCallback(async () => {
    try {
      setPurchases(await listCreditPurchases());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your purchases");
    } finally {
      setLoadingPurchases(false);
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setPurchases([]);
      setLoadingPurchases(false);
      return;
    }
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("onlooker:credits-refresh", onRefresh);
    return () => window.removeEventListener("onlooker:credits-refresh", onRefresh);
  }, [user, refresh]);

  return (
    <div className="mx-auto w-full max-w-5xl px-4 pb-28 pt-[max(env(safe-area-inset-top),3rem)] sm:px-6 lg:px-8">
      <PageBackButton label="Profile" fallback="/profile" />

      <h1 className="mt-3 font-display text-2xl tracking-tight text-foreground">Balance &amp; Cashout</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Your credits, purchase history, top-up packs and bank cash out, all in one place.
      </p>

      {!loading && !user ? (
        <div className="mt-6 max-w-md">
          <InlineSignIn
            title="Sign in to see your balance"
            message="Your credit balance, purchase history and cash-out options appear here the moment you're signed in."
          />
        </div>
      ) : (
        <>
          <CreditWalletCard />

          <div className="mt-6 rounded-2xl border border-border bg-surface-raised p-4">
            <div className="flex items-center justify-between">
              <span className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
                Purchase history
              </span>
              <Receipt className="size-4 text-signal" />
            </div>

            {loadingPurchases ? (
              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading purchases…
              </p>
            ) : purchases.length === 0 ? (
              <p className="mt-4 rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                No purchases yet. Credit packs you buy will show up here.
              </p>
            ) : (
              <ul className="mt-4 space-y-2">
                {purchases.map((purchase) => {
                  const pack = creditPackageById(purchase.packageId);
                  return (
                    <li
                      key={purchase.id}
                      className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface px-3 py-2.5 text-sm"
                    >
                      <span className="min-w-0">
                        <span className="block font-semibold text-foreground">
                          {purchase.credits} credits{pack ? ` · ${pack.name}` : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(purchase.createdAt).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-live">
                        ${(purchase.amountCents / 100).toFixed(2)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <BuyCreditsCard />
          <MyEarningsCard />
          <CreditPayoutDashboard />
        </>
      )}
    </div>
  );
}
