// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { CommunityCategory } from "@/lib/community";

export type CreatorVibe = {
  id: string;
  label: string;
  category: CommunityCategory;
  tag: string;
  hint: string;
};

/** Shared creator-first stream interests from the migration workflow. */
export const CREATOR_VIBES: CreatorVibe[] = [
  {
    id: "foodie",
    label: "Foodie",
    category: "meetups",
    tag: "food",
    hint: "Food walks, menus and lines",
  },
  {
    id: "car-spotters",
    label: "Car Spotters",
    category: "traffic",
    tag: "cars",
    hint: "Meets, traffic and street scenes",
  },
  {
    id: "style-scout",
    label: "Style Scout",
    category: "culture",
    tag: "style",
    hint: "Fashion, crowds and pop-ups",
  },
  {
    id: "street-music",
    label: "Street Music",
    category: "arts",
    tag: "live music",
    hint: "Buskers, shows and sets",
  },
  {
    id: "match-day",
    label: "Match Day",
    category: "sports",
    tag: "match day",
    hint: "Fan energy and game-day lines",
  },
  {
    id: "market-finds",
    label: "Market Finds",
    category: "markets",
    tag: "flea markets",
    hint: "Tables, vendors and deals",
  },
];

export function isCreatorVibeActive(
  vibe: CreatorVibe,
  category: CommunityCategory | "all",
  tag: string | null,
) {
  return category === vibe.category && tag === vibe.tag;
}
