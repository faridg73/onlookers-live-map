// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { BroadcastCategoryId } from "@/lib/broadcast-categories";
import {
  STRANGE_SIGHTINGS_ID,
  STRANGE_SIGHTINGS_LABEL,
} from "@/lib/strange-sightings";

/**
 * Hierarchical subcategories for all 17 main categories.
 *
 * Every subcategory carries its own keyword metadata. Those keywords are
 * written into the request payload when a bounty is posted, so search
 * indexing, analytics and matching all read the same precise vocabulary
 * instead of guessing from free text.
 */
export type SubcategoryOption = {
  label: string;
  keywords: readonly string[];
};

/** The 17th category lives outside the broadcast lanes. */
export type MainCategoryId = BroadcastCategoryId | typeof STRANGE_SIGHTINGS_ID;

export const SUBCATEGORY_TREE: Record<MainCategoryId, readonly SubcategoryOption[]> = {
  "breaking-incidents": [
    { label: "Accidents", keywords: ["accident", "collision", "crash", "incident"] },
    { label: "Fires", keywords: ["fire", "smoke", "brush fire", "structure fire"] },
    { label: "Severe Weather", keywords: ["storm", "flood", "wind", "severe weather"] },
    { label: "Hazards", keywords: ["hazard", "spill", "downed line", "unsafe"] },
    { label: "Emergency Services", keywords: ["police", "fire department", "paramedics", "first responders"] },
  ],
  "traffic-updates": [
    { label: "Road Closures", keywords: ["road closure", "detour", "blocked road"] },
    { label: "Congestion", keywords: ["traffic jam", "congestion", "backup", "gridlock"] },
    { label: "Public Transit", keywords: ["bus", "train", "metro", "transit delay"] },
    { label: "Construction Delays", keywords: ["construction", "lane closure", "roadwork"] },
    { label: "Parking Availability", keywords: ["parking", "lot full", "garage", "street parking"] },
  ],
  "arts-performances": [
    { label: "Street Musicians", keywords: ["busker", "street music", "live performance"] },
    { label: "Theater & Dance", keywords: ["theater", "dance", "stage show", "performance"] },
    { label: "Art Installations", keywords: ["installation", "mural", "public art", "sculpture"] },
    { label: "Galleries & Pop-ups", keywords: ["gallery", "pop-up", "exhibit", "opening night"] },
  ],
  "food-dining": [
    { label: "Food Trucks", keywords: ["food truck", "street food", "mobile kitchen"] },
    { label: "Night Markets", keywords: ["night market", "food market", "stalls"] },
    { label: "Restaurant Wait Times", keywords: ["wait time", "line", "restaurant queue", "busy"] },
    { label: "Cafe Culture", keywords: ["cafe", "coffee shop", "espresso", "bakery"] },
    { label: "Hidden Gems", keywords: ["hidden gem", "local favorite", "hole in the wall"] },
  ],
  "car-culture": [
    { label: "Exotics & Supercars", keywords: ["supercar", "exotic car", "hypercar"] },
    { label: "Classics", keywords: ["classic car", "vintage car", "restoration"] },
    { label: "Car Meets", keywords: ["car meet", "cars and coffee", "car show"] },
    { label: "Modified Builds", keywords: ["modified", "tuner", "custom build", "stance"] },
  ],
  "street-fashion": [
    { label: "Street Style", keywords: ["street style", "outfit", "fashion spotting"] },
    { label: "Trends", keywords: ["trend", "streetwear", "style trend"] },
    { label: "Shopping Hubs", keywords: ["boutique", "fashion district", "shopping street"] },
    { label: "Runway & Shows", keywords: ["runway", "fashion show", "lookbook"] },
  ],
  "events-sports": [
    { label: "Community Games", keywords: ["local game", "community sports", "pickup game"] },
    { label: "School & College Games", keywords: ["high school game", "college game", "campus sports"] },
    { label: "Tournaments", keywords: ["tournament", "playoff", "championship"] },
    { label: "Parades & Festivals", keywords: ["parade", "festival", "street fair"] },
    { label: "Gatherings", keywords: ["gathering", "meetup", "crowd"] },
  ],
  "nature-wildlife": [
    { label: "Trails & Hikes", keywords: ["trail", "hike", "trailhead", "lookout"] },
    { label: "Parks", keywords: ["park", "green space", "picnic area"] },
    { label: "Beach & Ocean", keywords: ["beach", "ocean", "surf", "shoreline"] },
    { label: "Wildlife Sightings", keywords: ["wildlife", "animal sighting", "birds"] },
    { label: "Sunset Spots", keywords: ["sunset", "golden hour", "viewpoint"] },
  ],
  "real-estate": [
    { label: "Open Houses", keywords: ["open house", "for sale", "listing tour", "showing"] },
    { label: "Property Tours", keywords: ["property tour", "walkthrough", "home tour", "apartment tour"] },
    { label: "Commercial Listings", keywords: ["commercial", "retail space", "office space", "lease"] },
    { label: "New Construction", keywords: ["construction", "new build", "development site"] },
    { label: "Neighborhood Tours", keywords: ["neighborhood", "street tour", "area walkthrough"] },
    { label: "Historic Homes & Architecture", keywords: ["historic home", "architecture", "landmark building"] },
  ],
  nightlife: [
    { label: "Clubs", keywords: ["club", "nightclub", "dance floor", "dj"] },
    { label: "Bars & Lounges", keywords: ["bar", "lounge", "cocktail", "rooftop"] },
    { label: "Concerts", keywords: ["concert", "live music", "gig", "venue"] },
    { label: "Comedy & Shows", keywords: ["comedy", "stand-up", "late show"] },
    { label: "Line & Door Check", keywords: ["line", "door", "cover charge", "wait"] },
  ],
  "tech-innovation": [
    { label: "Gadget Spotting", keywords: ["gadget", "device", "prototype"] },
    { label: "Robotics & Drones", keywords: ["robot", "drone", "automation"] },
    { label: "Tech Hubs & Demos", keywords: ["tech hub", "demo day", "startup", "expo"] },
    { label: "Autonomous Vehicles", keywords: ["self-driving", "robotaxi", "autonomous"] },
  ],
  "shopping-retail": [
    { label: "Mall Activity", keywords: ["mall", "shopping center", "foot traffic"] },
    { label: "Sales & Deals", keywords: ["sale", "discount", "clearance", "deal"] },
    { label: "Grand Openings", keywords: ["grand opening", "new store", "ribbon cutting"] },
    { label: "Stock & Availability", keywords: ["in stock", "sold out", "restock", "shelf check"] },
    { label: "Queues & Lines", keywords: ["line", "queue", "wait time"] },
  ],
  "fitness-outdoors": [
    { label: "Run Clubs", keywords: ["run club", "running", "5k"] },
    { label: "Skate Parks", keywords: ["skate park", "skateboarding", "bmx"] },
    { label: "Outdoor Workouts", keywords: ["outdoor workout", "bootcamp", "calisthenics"] },
    { label: "Courts & Fields", keywords: ["basketball court", "field", "pitch", "tennis"] },
    { label: "Water Sports", keywords: ["surf", "paddle", "kayak", "swim"] },
  ],
  "pets-animals": [
    { label: "Dog Parks", keywords: ["dog park", "dogs", "off leash"] },
    { label: "Adoption Events", keywords: ["adoption", "shelter", "rescue event"] },
    { label: "Local Wildlife", keywords: ["urban wildlife", "animal sighting"] },
    { label: "Lost & Found Pets", keywords: ["lost pet", "found dog", "missing cat"] },
  ],
  "community-culture": [
    { label: "Farmers Markets", keywords: ["farmers market", "produce", "vendors"] },
    { label: "Charity Drives", keywords: ["charity", "fundraiser", "donation drive"] },
    { label: "Local Traditions", keywords: ["tradition", "cultural event", "heritage"] },
    { label: "Libraries & Civic Centers", keywords: ["library", "civic center", "town hall", "public plaza"] },
    { label: "Schools & Campuses", keywords: ["school", "college", "campus", "university"] },
  ],
  "casual-irl": [
    { label: "General Hangouts", keywords: ["hangout", "just chatting", "irl"] },
    { label: "Street Interviews", keywords: ["street interview", "vox pop", "person on the street"] },
    { label: "Daily Life", keywords: ["daily life", "slice of life", "walk around"] },
    { label: "City Walks", keywords: ["city walk", "walking tour", "downtown"] },
  ],
  [STRANGE_SIGHTINGS_ID]: [
    { label: "UFO / UAP", keywords: ["ufo", "uap", "flying object"] },
    { label: "Unexplained Lights", keywords: ["unexplained light", "mystery light", "night sky"] },
    { label: "Unusual Aircraft", keywords: ["unusual aircraft", "unknown craft", "drone"] },
    { label: "Strange Sounds", keywords: ["strange sound", "boom", "unexplained noise"] },
    { label: "Unexplained Events", keywords: ["unexplained event", "anomaly", "mystery"] },
  ],
};

export const STRANGE_SIGHTINGS_MAIN_LABEL = STRANGE_SIGHTINGS_LABEL;

export function subcategoriesFor(id: MainCategoryId): readonly SubcategoryOption[] {
  return SUBCATEGORY_TREE[id] ?? [];
}

/** Keyword metadata for a chosen subcategory, used by analytics and search. */
export function keywordsForSubcategory(id: MainCategoryId, label: string | null): readonly string[] {
  if (!label) return [];
  return subcategoriesFor(id).find((entry) => entry.label === label)?.keywords ?? [];
}
