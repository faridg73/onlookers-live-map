// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { CoinsIcon, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OnlookerPlusPlans, PlusMark } from "@/components/OnlookerPlusPlans";
import { WalletTopUpSection } from "@/components/WalletTopUpSection";
import { TransactionLedgerTable } from "@/components/TransactionLedgerTable";
import {
  fetchUserWallet,
  listLedgerEntries,
  type LedgerEntry,
  type UserWallet,
} from "@/lib/wallet-ledger";
import { formatCreditCash } from "@/lib/credits";

/**
 * Account centre inside the profile: Onlooker+ membership, wallet top-ups and
 * the full transaction ledger, all reading the canonical wallet tables.
 */
export function AccountCenter() {
  const [wallet, setWallet] = useState<UserWallet | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const [nextWallet, nextEntries] = await Promise.all([
        fetchUserWallet(),
        listLedgerEntries(50),
      ]);
      setWallet(nextWallet);
      setEntries(nextEntries);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not load your account");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    const onRefresh = () => void refresh();
    window.addEventListener("onlooker:credits-refresh", onRefresh);
    return () => window.removeEventListener("onlooker:credits-refresh", onRefresh);
  }, [refresh]);

  const tier = wallet?.subscriptionTier ?? "free";

  return (
    <section className="mt-6 rounded-3xl border border-border bg-surface-raised p-3 sm:p-4 lg:p-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
        <div className="min-w-0">
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Wallet balance
          </p>
          <div className="mt-1 flex min-w-0 flex-wrap items-baseline gap-2">
            {loading ? (
              <span className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="size-4 animate-spin" /> Loading…
              </span>
            ) : (
              <>
                <span className="font-display text-4xl text-foreground">
                  {(wallet?.creditBalance ?? 0).toLocaleString()}
                </span>
                <span className="text-sm text-muted-foreground">
                  credits · {formatCreditCash(wallet?.creditBalance ?? 0)}
                </span>
              </>
            )}
          </div>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/40 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
          <CoinsIcon className="size-3.5" />
          {tier === "free" ? "Free plan" : <PlusMark label={tier} />}
        </span>
      </div>

      <Tabs defaultValue="plus" className="mt-4">
        <TabsList className="w-full">
          <TabsTrigger value="plus" className="flex-1 text-xs sm:text-sm">
            Onlooker+
          </TabsTrigger>
          <TabsTrigger value="topup" className="flex-1 text-xs sm:text-sm">
            Top up
          </TabsTrigger>
          <TabsTrigger value="history" className="flex-1 text-xs sm:text-sm">
            History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plus" className="mt-4">
          <OnlookerPlusPlans currentTier={tier} />
        </TabsContent>
        <TabsContent value="topup" className="mt-4">
          <WalletTopUpSection />
        </TabsContent>
        <TabsContent value="history" className="mt-4">
          <TransactionLedgerTable entries={entries} loading={loading} />
        </TabsContent>
      </Tabs>
    </section>
  );
}
