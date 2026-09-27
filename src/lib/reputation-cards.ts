// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export type ReputationCard = {
  id: string;
  name: string;
  handle: string | null;
  avatarUrl: string | null;
  verified: boolean;
  followerCount: number;
  followingCount: number;
  rating: number;
  reviewCount: number;
  bountiesCompleted: number;
  onTimeRate: number;
  idConfirmed: boolean;
};

const cache = new Map<string, Promise<ReputationCard | null>>();

async function load(ids: string[]): Promise<Map<string, ReputationCard>> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase.rpc as any)("public_reputation_cards", { _ids: ids });
  if (error) throw new Error(error.message);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (data ?? []) as any[];
  const avatars = await resolveAvatarUrls(rows.map((r) => r.avatar_url as string | null));
  const out = new Map<string, ReputationCard>();
  rows.forEach((r, i) => {
    out.set(r.id, {
      id: r.id,
      name: r.name || "Onlooker",
      handle: r.handle ?? null,
      avatarUrl: avatars[i] ?? null,
      verified: Boolean(r.is_verified),
      followerCount: r.follower_count ?? 0,
      followingCount: r.following_count ?? 0,
      rating: Number(r.rating ?? 0),
      reviewCount: r.review_count ?? 0,
      bountiesCompleted: r.bounties_completed ?? 0,
      onTimeRate: r.on_time_rate ?? 0,
      idConfirmed: Boolean(r.id_confirmed),
    });
  }
  return out;
}

/** Public reputation for one member, shared across every card on screen. */
export function fetchReputationCard(id: string): Promise<ReputationCard | null> {
  const hit = cache.get(id);
  if (hit) return hit;
  const p = load([id])
    .then((m) => m.get(id) ?? null)
    .catch((err) => {
      console.error("[reputation] could not load card", err);
      cache.delete(id);
      return null;
    });
  cache.set(id, p);
  return p;
}

/** Drop a cached card so the next fetch shows fresh numbers (e.g. after a new rating). */
export function invalidateReputationCard(id: string) {
  cache.delete(id);
}

export function handleFor(card: { handle: string | null; name: string }): string {
  const h = card.handle || card.name.toLowerCase().replace(/[^a-z0-9]+/g, "").slice(0, 16) || "onlooker";
  return `@${h}`;
}

/** Direct messaging isn't built yet, so Message buttons say so instead of doing nothing. */
export function openDirectMessage(name: string) {
  toast(`Messaging ${name} is coming soon.`);
}
