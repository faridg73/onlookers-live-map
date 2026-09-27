// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { BROADCAST_CATEGORIES, type BroadcastCategoryId } from "@/lib/broadcast-categories";
import type { CommunityCategory } from "@/lib/community";
import type { CategoryId } from "@/lib/onlooker";

/** A refinement chip shown under a selected vibe. */
export type VibeSubFilter = {
  /** Chip label the member reads. */
  label: string;
  /** Sub-lane inside the vibe's discovery group, when this chip narrows places. */
  subId: string | null;
  /** Extra words used to narrow listed events and member posts. */
  keywords: string[];
};

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
  /** Refinement chips shown under the vibe. */
  subFilters: VibeSubFilter[];
  /**
   * Vibes with no honest external place source lead with Onlooker's own
   * bounties, streams and member posts instead of filler listings.
   */
  ownContent: null | { bountyCategory: CategoryId; blurb: string; showPros?: boolean; hidePlaces?: boolean };
  /** Big-box/discount chains are dropped from this vibe's place results. */
  excludeBigBox?: boolean;
};

type Lookup = {
  groupSlug: string;
  subId?: string;
  eventKeywords: string[];
  subFilters: VibeSubFilter[];
  ownContent?: CreatorVibe["ownContent"];
  excludeBigBox?: boolean;
};

const VIBE_LOOKUP: Record<BroadcastCategoryId, Lookup> = {
  "breaking-incidents": {
    groupSlug: "landmarks",
    eventKeywords: ["emergency", "safety", "rally", "protest", "march"],
    ownContent: {
      bountyCategory: "community",
      blurb: "Live member reports and open requests for what's happening right now.",
      hidePlaces: true,
    },
    subFilters: [
      { label: "Accidents", subId: null, keywords: ["accident", "crash", "collision"] },
      { label: "Weather", subId: null, keywords: ["weather", "storm", "flood", "wind", "heat", "snow"] },
      { label: "Hazards", subId: null, keywords: ["hazard", "fire", "smoke", "gas", "spill", "outage"] },
      { label: "Emergency services", subId: null, keywords: ["police", "fire", "ambulance", "emergency", "rescue"] },
    ],
  },
  "traffic-updates": {
    groupSlug: "traffic",
    eventKeywords: ["parade", "marathon", "race", "closure", "transit"],
    ownContent: {
      bountyCategory: "transit",
      blurb: "Member traffic reports and open requests for a live look at the road.",
    },
    subFilters: [
      { label: "Road closures", subId: null, keywords: ["closure", "closed", "detour", "blocked"] },
      { label: "Public transit", subId: "transit", keywords: ["bus", "transit", "station", "stop"] },
      { label: "Metro & rail", subId: "metro", keywords: ["metro", "subway", "train", "rail"] },
      { label: "Parking", subId: "parking", keywords: ["parking", "lot", "garage"] },
    ],
  },
  "arts-performances": {
    groupSlug: "performances",
    eventKeywords: ["theatre", "theater", "arts", "musical", "broadway", "opera", "ballet", "dance", "gallery", "busk"],
    subFilters: [
      { label: "Street musicians", subId: "buskers", keywords: ["busk", "street music", "acoustic"] },
      { label: "Theater", subId: "plazas", keywords: ["theatre", "theater", "broadway", "musical", "opera"] },
      { label: "Art installations", subId: "arts", keywords: ["art", "installation", "mural", "gallery"] },
      { label: "Pop-ups", subId: "parks", keywords: ["pop-up", "popup", "showcase"] },
    ],
  },
  "food-dining": {
    groupSlug: "food",
    eventKeywords: ["food", "wine", "beer", "taste", "culinary", "restaurant", "brunch", "dining", "chef"],
    subFilters: [
      { label: "Restaurants", subId: "restaurants", keywords: ["restaurant", "dinner", "dining"] },
      { label: "Cafés", subId: "cafes", keywords: ["cafe", "coffee", "espresso"] },
      { label: "Bakeries", subId: "bakeries", keywords: ["bakery", "pastry", "bread"] },
      { label: "Takeaway", subId: "takeaway", keywords: ["takeaway", "takeout", "food truck"] },
    ],
  },
  "car-culture": {
    groupSlug: "casual",
    eventKeywords: ["auto", "car", "motor", "racing", "nascar", "monster", "truck", "bike"],
    ownContent: {
      bountyCategory: "vehicles",
      blurb: "Member car spots and open requests for meets, exotics and builds nearby.",
      hidePlaces: true,
    },
    subFilters: [
      { label: "Exotics & supercars", subId: null, keywords: ["exotic", "supercar", "ferrari", "lambo", "porsche", "mclaren"] },
      { label: "Classics", subId: null, keywords: ["classic", "vintage", "restored", "muscle"] },
      { label: "Meetups", subId: null, keywords: ["meet", "cars and coffee", "cruise", "show"] },
      { label: "Modified & tuners", subId: null, keywords: ["modified", "tuner", "stance", "build", "jdm"] },
    ],
  },
  "street-fashion": {
    groupSlug: "fashion",
    excludeBigBox: true,
    eventKeywords: ["fashion", "style", "pop-up", "runway", "design", "beauty"],
    subFilters: [
      { label: "Boutiques", subId: "boutiques", keywords: ["boutique", "fashion", "designer"] },
      { label: "Sneakers", subId: "sneakers", keywords: ["sneaker", "shoe", "kicks", "drop"] },
      { label: "Accessories", subId: "jewelry", keywords: ["jewelry", "accessory", "watch"] },
      { label: "Beauty & barbers", subId: "beauty", keywords: ["beauty", "barber", "salon", "hair"] },
    ],
  },
  "events-sports": {
    groupSlug: "events",
    subId: "stadiums",
    eventKeywords: ["sport", "basketball", "football", "baseball", "soccer", "hockey", "game", "match", "tournament", "parade"],
    subFilters: [
      { label: "Stadiums & arenas", subId: "stadiums", keywords: ["stadium", "arena", "game", "match"] },
      { label: "Tournaments", subId: "stadiums", keywords: ["tournament", "championship", "playoff", "cup"] },
      { label: "Community games", subId: "festivals", keywords: ["league", "community", "youth", "amateur"] },
      { label: "Parades", subId: "festivals", keywords: ["parade", "march", "procession"] },
    ],
  },
  "nature-wildlife": {
    groupSlug: "scenic",
    eventKeywords: ["nature", "garden", "park", "hike", "zoo", "aquarium", "wildlife"],
    subFilters: [
      { label: "Trails", subId: "trails", keywords: ["trail", "hike", "hiking"] },
      { label: "Parks", subId: "parks", keywords: ["park", "garden", "nature"] },
      { label: "Beaches & ocean", subId: "beaches", keywords: ["beach", "ocean", "surf", "pier"] },
      { label: "Sunset spots", subId: "views", keywords: ["sunset", "lookout", "viewpoint", "overlook"] },
    ],
  },
  "real-estate": {
    groupSlug: "landmarks",
    eventKeywords: ["home", "architecture", "real estate", "open house", "design"],
    ownContent: {
      bountyCategory: "realestate",
      blurb: "Verified property visits, open requests and our vetted Pro network.",
      showPros: true,
      hidePlaces: true,
    },
    subFilters: [
      { label: "Property visits", subId: null, keywords: ["visit", "walkthrough", "inspection", "property"] },
      { label: "Open houses", subId: null, keywords: ["open house", "showing", "listing", "for sale"] },
      { label: "Construction", subId: null, keywords: ["construction", "build", "site", "development"] },
      { label: "Architecture", subId: null, keywords: ["architecture", "historic", "design", "facade"] },
    ],
  },
  nightlife: {
    groupSlug: "nightlife",
    eventKeywords: ["club", "nightlife", "dj", "comedy", "concert", "party", "lounge"],
    subFilters: [
      { label: "Clubs", subId: "clubs", keywords: ["club", "dj", "dance"] },
      { label: "Lounges & bars", subId: "bars", keywords: ["lounge", "bar", "cocktail"] },
      { label: "Concerts", subId: "casino", keywords: ["concert", "live music", "tour"] },
      { label: "Late-night eats", subId: "late-eats", keywords: ["late night", "diner", "food"] },
    ],
  },
  "tech-innovation": {
    groupSlug: "tech",
    eventKeywords: ["tech", "expo", "conference", "summit", "hackathon", "robot", "gaming", "startup", "ai", "demo day"],
    subFilters: [
      { label: "Tech hubs", subId: "hubs", keywords: ["startup", "hub", "incubator", "coworking"] },
      { label: "Campuses & labs", subId: "campuses", keywords: ["campus", "lab", "research", "university"] },
      { label: "Expos & demos", subId: "expos", keywords: ["expo", "demo", "conference", "summit", "hackathon"] },
      { label: "Gadgets & robotics", subId: "gadgets", keywords: ["gadget", "robot", "drone", "hardware"] },
    ],
  },
  "shopping-retail": {
    groupSlug: "malls",
    eventKeywords: ["market", "sale", "shop", "retail", "vintage", "bazaar"],
    subFilters: [
      { label: "Malls", subId: "malls", keywords: ["mall", "center", "galleria"] },
      { label: "Big stores", subId: "stores", keywords: ["store", "department", "outlet"] },
      { label: "Cinemas", subId: "cinemas", keywords: ["cinema", "movie", "theater"] },
      { label: "Parking decks", subId: "parking", keywords: ["parking", "garage", "deck"] },
    ],
  },
  "fitness-outdoors": {
    groupSlug: "scenic",
    eventKeywords: ["run", "marathon", "fitness", "yoga", "skate", "cycling", "5k"],
    subFilters: [
      { label: "Run clubs", subId: "trails", keywords: ["run", "marathon", "5k", "jog"] },
      { label: "Skate parks", subId: "parks", keywords: ["skate", "bmx", "bowl"] },
      { label: "Outdoor workouts", subId: "parks", keywords: ["workout", "bootcamp", "yoga", "fitness"] },
      { label: "Trails & lookouts", subId: "views", keywords: ["trail", "hike", "lookout", "cycling"] },
    ],
  },
  "pets-animals": {
    groupSlug: "pets",
    eventKeywords: ["pet", "dog", "cat", "adoption", "animal", "zoo", "shelter", "rescue"],
    subFilters: [
      { label: "Dog parks", subId: "dogparks", keywords: ["dog park", "dog run", "off leash"] },
      { label: "Adoption events", subId: "petshops", keywords: ["adoption", "rescue", "shelter", "foster"] },
      { label: "Vets & clinics", subId: "vets", keywords: ["vet", "clinic", "animal hospital"] },
      { label: "Local wildlife", subId: "wildlife", keywords: ["wildlife", "zoo", "aquarium", "bird"] },
    ],
  },
  "community-culture": {
    groupSlug: "markets",
    eventKeywords: ["community", "festival", "fair", "market", "charity", "cultural", "heritage"],
    subFilters: [
      { label: "Farmers markets", subId: "farmers", keywords: ["farmers", "market", "produce"] },
      { label: "Food trucks", subId: "foodtrucks", keywords: ["food truck", "street food"] },
      { label: "Charity drives", subId: "groceries", keywords: ["charity", "fundraiser", "drive", "donation"] },
      { label: "Flea markets", subId: "fleamarkets", keywords: ["flea", "swap", "vintage", "bazaar"] },
    ],
  },
  "casual-irl": {
    groupSlug: "casual",
    eventKeywords: ["meetup", "hangout", "social", "community", "open mic", "trivia"],
    subFilters: [
      { label: "Cafés", subId: "cafes", keywords: ["cafe", "coffee", "espresso"] },
      { label: "Plazas & squares", subId: "plazas", keywords: ["plaza", "square", "boardwalk", "promenade"] },
      { label: "Parks", subId: "parks", keywords: ["park", "green", "lawn"] },
      { label: "Study spots", subId: "libraries", keywords: ["library", "book", "study"] },
    ],
  },
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
    subFilters: lookup.subFilters,
    ownContent: lookup.ownContent ?? null,
    ...(lookup.excludeBigBox ? { excludeBigBox: true } : {}),
  };
});
