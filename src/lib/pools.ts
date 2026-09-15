import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/sanitize";

/** The signed-in person as shown on the pools page. */
export type PoolIdentity = {
  userId: string;
  username: string;
  avatarUrl: string | null;
  hunterLevel: number;
  isVerified: boolean;
};

/** Reads the identity of the signed-in member, bound strictly to their own id. */
export async function fetchPoolIdentity(expectedUserId: string): Promise<PoolIdentity | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user || auth.user.id !== expectedUserId) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("id, username, display_name, avatar_url, hunter_level, is_verified")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    userId: data.id,
    username: data.username ?? data.display_name ?? "onlooker",
    avatarUrl: data.avatar_url ?? null,
    hunterLevel: data.hunter_level ?? 1,
    isVerified: Boolean(data.is_verified),
  };
}

export type PoolFormErrors = { title?: string; place?: string; goal?: string };

export const POOL_GOAL_MIN = 20;
export const POOL_GOAL_MAX = 5000;

/** Field-by-field checks run before a pool is opened. */
export function poolFormErrors(input: {
  title: string;
  place: string;
  goalCredits: number;
}): PoolFormErrors {
  const errors: PoolFormErrors = {};
  const title = sanitizeText(input.title, { maxLength: 90 }).trim();
  const place = sanitizeText(input.place, { maxLength: 120 }).trim();
  if (title.length < 6) errors.title = "Say what should happen, at least 6 characters.";
  if (place.length < 3) errors.place = "Add where this should happen, e.g. Soldier Field, Chicago.";
  if (!Number.isFinite(input.goalCredits) || input.goalCredits < POOL_GOAL_MIN)
    errors.goal = `Pick a goal of at least ${POOL_GOAL_MIN} Credits.`;
  else if (input.goalCredits > POOL_GOAL_MAX)
    errors.goal = `Keep the goal under ${POOL_GOAL_MAX} Credits.`;
  return errors;
}

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
  const poolIds = pools.map((p) => p.id);

  const backers = new Map<string, number>();
  if (poolIds.length > 0) {
    const { data: counts } = await supabase.rpc("pool_backer_counts", {
      _pool_ids: poolIds,
    });
    for (const row of counts ?? []) {
      backers.set(row.pool_id, row.backer_count);
    }
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
    backers: backers.get(p.id) ?? 0,
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
  const problems = Object.values(poolFormErrors(input));
  if (problems.length > 0) throw new Error(problems[0]!);
  const { data, error } = await supabase.rpc("create_bounty_pool", {
    _title: sanitizeText(input.title, { maxLength: 90 }).trim(),
    _place: sanitizeText(input.place, { maxLength: 120 }).trim(),
    _goal_credits: Math.round(input.goalCredits),
    _kind: input.kind,
    ...(typeof input.latitude === "number" ? { _latitude: input.latitude } : {}),
    ...(typeof input.longitude === "number" ? { _longitude: input.longitude } : {}),
    _hours: input.hours ?? 24,
  });
  if (error) throw new Error(error.message);
  return data as unknown as string;
}

/** The smallest starter chip-in the creator must put behind their own pool. */
export const POOL_STARTER_CREDITS = 4;

/**
 * Opens a pool as the confirmed signed-in member and seeds it with their own
 * starter chip-in, so a pool can never be opened by an unbound session.
 */
export async function openPoolAsMember(
  expectedUserId: string,
  input: {
    title: string;
    place: string;
    goalCredits: number;
    kind: "bounty" | "meetup";
    starterCredits: number;
    latitude?: number | null;
    longitude?: number | null;
    hours?: number;
  },
): Promise<{ poolId: string; pooled: number }> {
  const identity = await fetchPoolIdentity(expectedUserId);
  if (!identity) throw new Error("Sign in again, we couldn't confirm your account.");
  const starter = Math.max(POOL_STARTER_CREDITS, Math.round(input.starterCredits));
  const poolId = await createPool(input);
  const pooled = await contributeToPool(poolId, starter);
  return { poolId, pooled };
}

/** Chips Credits from the signed-in wallet into a pool; returns the new total. */
export async function contributeToPool(poolId: string, amount: number): Promise<number> {
  const { data, error } = await supabase.rpc("contribute_to_pool", {
    _pool_id: poolId,
    _amount: Math.round(amount),
  });
  if (error) {
    if (/insufficient credits/i.test(error.message))
      throw new Error("Not enough Credits, top up your balance to chip in.");
    throw new Error(error.message);
  }
  return Number(data ?? 0);
}
