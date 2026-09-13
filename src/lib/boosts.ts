import { supabase } from "@/integrations/supabase/client";

export const BOOST_AMOUNTS = [10, 20, 50] as const;

export type BoostTotals = Record<string, number>;

/** Sum of every chip-in per bounty, keyed by request id. */
export async function fetchBoostTotals(): Promise<BoostTotals> {
  // Chip-in rows are private, so signed-out visitors simply see no boosts.
  const { data: session } = await supabase.auth.getSession();
  if (!session.session) return {};
  const { data, error } = await supabase.from("bounty_boosts").select("request_id, amount");
  if (error) throw error;
  const totals: BoostTotals = {};
  for (const row of data ?? []) {
    totals[row.request_id] = (totals[row.request_id] ?? 0) + Number(row.amount);
  }
  return totals;
}

/** Chip in extra cash on someone else's bounty. */
export async function addBoost(requestId: string, amount: number) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to boost a bounty.");
  const { error } = await supabase
    .from("bounty_boosts")
    .insert({ request_id: requestId, booster_id: auth.user.id, amount });
  if (error) throw error;
}
