import type { CommunityCategory } from "@/lib/community";
import type { CategoryId } from "@/lib/onlooker";

export type BroadcastCategoryId =
  | "breaking-incidents"
  | "traffic-updates"
  | "arts-performances"
  | "food-dining"
  | "car-culture"
  | "street-fashion"
  | "events-sports"
  | "nature-wildlife"
  | "real-estate"
  | "nightlife"
  | "tech-innovation"
  | "shopping-retail"
  | "fitness-outdoors"
  | "pets-animals"
  | "community-culture"
  | "casual-irl";

export type BroadcastCategory = {
  id: BroadcastCategoryId;
  label: string;
  icon: string;
  communityCategory: CommunityCategory;
  requestCategory: CategoryId;
  subcategories: readonly string[];
};

/** Creator-facing lanes. Each maps to an existing Discover feed lane for compatibility. */
const DEFAULT_BROADCAST_CATEGORY: BroadcastCategory = {
  id: "breaking-incidents",
  label: "Breaking News & Incidents",
  icon: "🚨",
  communityCategory: "breaking",
  requestCategory: "community",
  subcategories: ["Accidents", "Weather", "Hazards", "Emergency Services"],
};

export const BROADCAST_CATEGORIES: readonly BroadcastCategory[] = [
  DEFAULT_BROADCAST_CATEGORY,
  {
    id: "traffic-updates",
    label: "Traffic & Public Updates",
    icon: "🚦",
    communityCategory: "traffic",
    requestCategory: "transit",
    subcategories: ["Road Closures", "Public Transit", "Congestion", "Heavy Traffic"],
  },
  {
    id: "arts-performances",
    label: "Arts & Performances",
    icon: "🎨",
    communityCategory: "arts",
    requestCategory: "art",
    subcategories: ["Street Musicians", "Theater", "Art Installations", "Pop-ups"],
  },
  {
    id: "food-dining",
    label: "Food & Local Dining",
    icon: "🍜",
    communityCategory: "meetups",
    requestCategory: "food",
    subcategories: ["Food Trucks", "Night Markets", "Hidden Gems", "Cafe Culture"],
  },
  {
    id: "car-culture",
    label: "Car Culture & Spotting",
    icon: "🏎️",
    communityCategory: "traffic",
    requestCategory: "vehicles",
    subcategories: ["Exotics", "Supercar", "Classic", "Meetup", "Modified"],
  },
  {
    id: "street-fashion",
    label: "Style & Street Fashion",
    icon: "✨",
    communityCategory: "culture",
    requestCategory: "street",
    subcategories: ["Trends", "Outfits", "Shopping Hubs"],
  },
  {
    id: "events-sports",
    label: "Local Events & Sports",
    icon: "🏆",
    communityCategory: "sports",
    requestCategory: "sports",
    subcategories: ["Community Games", "Tournaments", "Parades", "Gatherings"],
  },
  {
    id: "nature-wildlife",
    label: "Nature & Wildlife",
    icon: "🌿",
    communityCategory: "general",
    requestCategory: "outdoors",
    subcategories: ["Trails", "Parks", "Ocean/Beach Sightings", "Sunset Spots"],
  },
  {
    id: "real-estate",
    label: "Real Estate & Architecture",
    icon: "🏛️",
    communityCategory: "culture",
    requestCategory: "realestate",
    subcategories: ["Neighborhood Tours", "Construction", "Historic Homes"],
  },
  {
    id: "nightlife",
    label: "Nightlife & Entertainment",
    icon: "🌙",
    communityCategory: "arts",
    requestCategory: "nightlife",
    subcategories: ["Clubs", "Lounges", "Concerts", "Comedy"],
  },
  {
    id: "tech-innovation",
    label: "Tech & Innovation",
    icon: "🤖",
    communityCategory: "general",
    requestCategory: "events",
    subcategories: ["Gadget Spotting", "Robotics", "Local Tech Hubs"],
  },
  {
    id: "shopping-retail",
    label: "Shopping & Retail",
    icon: "🛍️",
    communityCategory: "markets",
    requestCategory: "markets",
    subcategories: ["Sales", "Grand Openings", "Mall Activity"],
  },
  {
    id: "fitness-outdoors",
    label: "Fitness & Outdoors",
    icon: "🏃",
    communityCategory: "sports",
    requestCategory: "outdoors",
    subcategories: ["Run Clubs", "Skate Parks", "Outdoor Workouts"],
  },
  {
    id: "pets-animals",
    label: "Pets & Animals",
    icon: "🐾",
    communityCategory: "general",
    requestCategory: "community",
    subcategories: ["Dog Parks", "Adoption Events", "Local Wildlife"],
  },
  {
    id: "community-culture",
    label: "Community & Culture",
    icon: "🤝",
    communityCategory: "culture",
    requestCategory: "community",
    subcategories: ["Farmers Markets", "Charity Drives", "Local Traditions"],
  },
  {
    id: "casual-irl",
    label: "Casual IRL / Just Chatting",
    icon: "💬",
    communityCategory: "general",
    requestCategory: "street",
    subcategories: ["General Hangouts", "Street Interviews", "Daily Life"],
  },
] as const;

export function broadcastCategoryById(id: BroadcastCategoryId): BroadcastCategory {
  return BROADCAST_CATEGORIES.find((category) => category.id === id) ?? DEFAULT_BROADCAST_CATEGORY;
}