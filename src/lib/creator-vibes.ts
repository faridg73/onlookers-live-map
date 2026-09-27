// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { BROADCAST_CATEGORIES, type BroadcastCategoryId } from "@/lib/broadcast-categories";
import type { CommunityCategory } from "@/lib/community";

export type CreatorVibe = {
  id: BroadcastCategoryId;
  label: string;
  icon: string;
  category: CommunityCategory;
  hint: string;
  /** Discovery group used to find nearby places for this vibe. */
  groupSlug: string;
  /** Optional sub-lane inside the discovery group. */
  subId: string | null;
  /** Words that mark a listed event as belonging to this vibe. */
  eventKeywords: string[];
};

const VIBE_LOOKUP: Record<BroadcastCategoryId, { groupSlug: string; subId?: string; eventKeywords: string[] }> = {
  "breaking-incidents": { groupSlug: "landmarks", eventKeywords: ["emergency", "safety", "rally", "protest", "march"] },
  "traffic-updates": { groupSlug: "transit", eventKeywords: ["parade", "marathon", "race", "closure", "transit"] },
  "arts-performances": { groupSlug: "performances", eventKeywords: ["theatre", "theater", "arts", "musical", "broadway", "opera", "ballet", "dance", "gallery", "busk"] },
  "food-dining": { groupSlug: "food", eventKeywords: ["food", "wine", "beer", "taste", "culinary", "restaurant", "brunch", "dining", "chef"] },
  "car-culture": { groupSlug: "transit", eventKeywords: ["auto", "car", "motor", "racing", "nascar", "monster", "truck", "bike"] },
  "street-fashion": { groupSlug: "malls", eventKeywords: ["fashion", "style", "pop-up", "design", "beauty"] },
  "events-sports": { groupSlug: "events", subId: "stadiums", eventKeywords: ["sport", "basketball", "football", "baseball", "soccer", "hockey", "game", "match", "tournament", "parade"] },
  "nature-wildlife": { groupSlug: "scenic", eventKeywords: ["nature", "garden", "park", "hike", "zoo", "aquarium", "wildlife"] },
  "real-estate": { groupSlug: "landmarks", eventKeywords: ["home", "architecture", "real estate", "open house", "design"] },
  nightlife: { groupSlug: "nightlife", eventKeywords: ["club", "nightlife", "dj", "comedy", "concert", "party", "lounge"] },
  "tech-innovation": { groupSlug: "events", subId: "expos", eventKeywords: ["tech", "expo", "conference", "summit", "hackathon", "robot", "gaming"] },
  "shopping-retail": { groupSlug: "malls", eventKeywords: ["market", "sale", "shop", "retail", "vintage", "bazaar"] },
  "fitness-outdoors": { groupSlug: "scenic", eventKeywords: ["run", "marathon", "fitness", "yoga", "skate", "cycling", "5k"] },
  "pets-animals": { groupSlug: "scenic", eventKeywords: ["pet", "dog", "cat", "adoption", "animal", "zoo"] },
  "community-culture": { groupSlug: "markets", eventKeywords: ["community", "festival", "fair", "market", "charity", "cultural", "heritage"] },
  "casual-irl": { groupSlug: "landmarks", eventKeywords: ["meetup", "hangout", "social", "community"] },
};

/** Discover quick-filter vibes — always the canonical 16 broadcast categories. */
export const CREATOR_VIBES: CreatorVibe[] = BROADCAST_CATEGORIES.map((cat) => {
  const lookup = VIBE_LOOKUP[cat.id];
  return {
    id: cat.id,
    label: cat.label,
    icon: cat.icon,
    category: cat.communityCategory,
    hint: cat.subcategories.join(", "),
    groupSlug: lookup.groupSlug,
    subId: lookup.subId ?? null,
    eventKeywords: lookup.eventKeywords,
  };
});
