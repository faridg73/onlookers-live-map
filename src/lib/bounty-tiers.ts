import type { LiveRequest } from "@/lib/onlooker";

/** Credit value where a bounty becomes a glowing gold pin. */
export const GOLD_BOUNTY_CREDITS = 200;

export type BountyTier = "standard" | "medium" | "gold";

/** Which visual theme a pin uses, based on its total credit bounty. */
export function bountyTier(credits: number): BountyTier {
  if (credits >= GOLD_BOUNTY_CREDITS) return "gold";
  if (credits >= 4) return "medium";
  return "standard";
}

export const isGoldBounty = (credits: number) => bountyTier(credits) === "gold";

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
  medium: "Credit bounty",
  gold: "Gold bounty",
};
