import type { LiveRequest } from "@/lib/onlooker";

/** Coin value where a bounty becomes a glowing gold pin. */
export const GOLD_BOUNTY_COINS = 200;

export type BountyTier = "standard" | "medium" | "gold";

/** Which visual theme a pin uses, based on its total coin bounty. */
export function bountyTier(coins: number): BountyTier {
  if (coins >= GOLD_BOUNTY_COINS) return "gold";
  if (coins >= 4) return "medium";
  return "standard";
}

export const isGoldBounty = (coins: number) => bountyTier(coins) === "gold";

/** Simple placeholder glyph for a category, used on the small standard pins. */
export function categoryGlyph(category: LiveRequest["category"] | null | undefined): string {
  switch (category) {
    case "food":
      return "🍽";
    case "vehicles":
      return "🚗";
    case "outdoors":
      return "🏞";
    case "nightlife":
      return "🍸";
    case "events":
      return "⏱";
    default:
      return "▬";
  }
}

export const TIER_LABELS: Record<BountyTier, string> = {
  standard: "Standard view",
  medium: "Coin bounty",
  gold: "Gold bounty",
};
