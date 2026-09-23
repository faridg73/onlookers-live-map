// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";

/** Reliability tiers earned by completing bounties (10 XP each, a level per 500 XP). */
export type HunterTier = {
  name: "Bronze" | "Silver" | "Gold" | "Elite";
  minLevel: number;
  /** Tailwind classes for the badge. */
  badge: string;
  /** Colour used for this hunter's map marker. */
  dot: string;
};

export const HUNTER_TIERS: HunterTier[] = [
  { name: "Bronze", minLevel: 1, badge: "bg-tier-bronze text-foreground", dot: "var(--tier-bronze)" },
  { name: "Silver", minLevel: 3, badge: "bg-tier-silver text-background", dot: "var(--tier-silver)" },
  { name: "Gold", minLevel: 6, badge: "bg-tier-gold text-background", dot: "var(--tier-gold)" },
  { name: "Elite", minLevel: 10, badge: "bg-signal text-signal-foreground", dot: "var(--signal)" },
];

export const XP_PER_BOUNTY = 10;
export const XP_PER_LEVEL = 500;

export function tierForLevel(level: number): HunterTier {
  return [...HUNTER_TIERS].reverse().find((t) => level >= t.minLevel) ?? HUNTER_TIERS[0]!;
}

/** Points still needed before the next level-up celebration. */
export function xpToNextLevel(xp: number) {
  return XP_PER_LEVEL - (xp % XP_PER_LEVEL);
}

export type HunterStats = {
  xp: number;
  hunterLevel: number;
  isIncognito: boolean;
  alias: string;
  displayName: string;
  avatarUrl: string | null;
};

export async function fetchHunterStats(): Promise<HunterStats | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("xp, hunter_level, is_incognito, alias, display_name, avatar_url")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    xp: data.xp ?? 0,
    hunterLevel: data.hunter_level ?? 1,
    isIncognito: data.is_incognito ?? false,
    alias: data.alias ?? "Onlooker_Fox",
    displayName: data.display_name ?? "onlooker",
    avatarUrl: data.avatar_url ?? null,
  };
}

/** Turns profile masking on or off for the signed-in person. */
export async function setIncognito(on: boolean) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to change this.");
  const { error } = await supabase
    .from("profiles")
    .update({ is_incognito: on })
    .eq("id", auth.user.id);
  if (error) throw error;
}
