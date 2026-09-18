import { supabase } from "@/integrations/supabase/client";
import { submitEarningsPayout } from "@/lib/cashout.functions";

export type WalletBalance = {
  available: number;
  pending: number;
  lifetime: number;
};

const EMPTY: WalletBalance = { available: 0, pending: 0, lifetime: 0 };

/** Earnings wallet totals for the signed-in person. */
export async function fetchWalletBalance(): Promise<WalletBalance | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("wallet_balances")
    .select("available_balance, pending_balance, lifetime_earnings")
    .eq("user_id", auth.user.id)
    .maybeSingle();
  if (error) return EMPTY;
  if (!data) return EMPTY;
  return {
    available: Number(data.available_balance ?? 0),
    pending: Number(data.pending_balance ?? 0),
    lifetime: Number(data.lifetime_earnings ?? 0),
  };
}

export type PayoutRequest = {
  id: string;
  amount: number;
  destination: string;
  status: string;
  created_at: string;
};

/** Files a payout request for admin review and holds the amount aside. */
export async function requestEarningsPayout(amount: number, destination = "bank") {
  const result = await submitEarningsPayout({ data: { amount, destination } });
  if (result.error || !result.id) throw new Error(result.error ?? "Could not file the payout request");
  return result.id;
}

/** Payout requests filed by the signed-in person, newest first. */
export async function listMyPayoutRequests(): Promise<PayoutRequest[]> {
  const { data, error } = await supabase
    .from("payout_requests")
    .select("id, amount, destination, status, created_at")
    .order("created_at", { ascending: false })
    .limit(20);
  if (error) return [];
  return (data ?? []).map((row) => ({
    id: row.id,
    amount: Number(row.amount),
    destination: row.destination,
    status: row.status,
    created_at: row.created_at,
  }));
}
