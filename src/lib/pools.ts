import { supabase } from "@/integrations/supabase/client";

/** A community-funded bounty or sponsored flash meetup. */
export type BountyPool = {
  id: string;
  creatorId: string;
  title: string;
  place: string;
  goalCredits: number;
  pooledCredits: number;
  kind: "bounty" | "meetup";
  status: string;
  expiresAt: string | null;
  createdAt: string;
  backers: number;
};

export const POOL_CHIP_IN_AMOUNTS = [4, 8, 20, 40] as const;
export const POOL_GOAL_PRESETS = [80, 200, 400, 800] as const;

export async function listPools(): Promise<BountyPool[]> {
  const { data, error } = await supabase
    .from("bounty_pools")
    .select(
      "id, creator_id, title, place, goal_credits, pooled_credits, kind, status, expires_at, created_at",
    )
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) throw new Error(error.message);

  const pools = data ?? [];
  const { data: contributions } = await supabase
    .from("pool_contributions")
    .select("pool_id, user_id")
    .in(
      "pool_id",
      pools.map((p) => p.id),
    );

  const backers = new Map<string, Set<string>>();
  for (const row of contributions ?? []) {
    const set = backers.get(row.pool_id) ?? new Set<string>();
    set.add(row.user_id);
    backers.set(row.pool_id, set);
  }

  return pools.map((p) => ({
    id: p.id,
    creatorId: p.creator_id,
    title: p.title,
    place: p.place,
    goalCredits: p.goal_credits,
    pooledCredits: p.pooled_credits,
    kind: p.kind === "meetup" ? "meetup" : "bounty",
    status: p.status,
    expiresAt: p.expires_at,
    createdAt: p.created_at,
    backers: backers.get(p.id)?.size ?? 0,
  }));
}

export async function createPool(input: {
  title: string;
  place: string;
  goalCredits: number;
  kind: "bounty" | "meetup";
  latitude?: number | null;
  longitude?: number | null;
  hours?: number;
}): Promise<string> {
  const { data, error } = await supabase.rpc("create_bounty_pool", {
    _title: input.title,
    _place: input.place,
    _goal_credits: Math.round(input.goalCredits),
    _kind: input.kind,
    ...(typeof input.latitude === "number" ? { _latitude: input.latitude } : {}),
    ...(typeof input.longitude === "number" ? { _longitude: input.longitude } : {}),
    _hours: input.hours ?? 24,
  });
  if (error) throw new Error(error.message);
  return data as unknown as string;
}

/** Chips Credits from the signed-in wallet into a pool; returns the new total. */
export async function contributeToPool(poolId: string, amount: number): Promise<number> {
  const { data, error } = await supabase.rpc("contribute_to_pool", {
    _pool_id: poolId,
    _amount: Math.round(amount),
  });
  if (error) {
    if (/insufficient credits/i.test(error.message)) throw new Error("Insufficient Credits");
    throw new Error(error.message);
  }
  return Number(data ?? 0);
}
