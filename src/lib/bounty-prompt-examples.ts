// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import type { MainCategoryId } from "@/lib/category-subcategories";

type PromptContext = {
  helper: string;
  placeholder: string;
  examples: readonly [string, string, string];
};

type PromptBlueprint = {
  helper: (focus: string) => string;
  placeholder: (focus: string) => string;
  examples: (focus: string) => readonly [string, string, string];
};

const focusName = (subcategory: string | null, fallback: string) => subcategory ?? fallback;

const PROMPT_BLUEPRINTS: Record<MainCategoryId, PromptBlueprint> = {
  "breaking-incidents": {
    helper: (focus) => `Describe the ${focus.toLowerCase()} scene you need checked without asking anyone to enter danger.`,
    placeholder: (focus) => `Show me a safe live view of the ${focus.toLowerCase()} near…`,
    examples: (focus) => [
      `Show the current ${focus.toLowerCase()} response from a safe public area`,
      `Confirm whether the ${focus.toLowerCase()} is still active and which roads are affected`,
      `Capture a steady wide view of the ${focus.toLowerCase()} without approaching the scene`,
    ],
  },
  "traffic-updates": {
    helper: (focus) => `Ask for a current road, parking, or transit check focused on ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Check the current ${focus.toLowerCase()} situation at…`,
    examples: (focus) => [
      `Show the current ${focus.toLowerCase()} in both directions`,
      `Check whether the ${focus.toLowerCase()} is clearing or getting worse`,
      `Capture the safest alternate route around the ${focus.toLowerCase()}`,
    ],
  },
  "arts-performances": {
    helper: (focus) => `Request a short atmosphere check or live preview of ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show me what the ${focus.toLowerCase()} looks and sounds like at…`,
    examples: (focus) => [
      `Capture a 5-minute preview of the ${focus.toLowerCase()}`,
      `Show the crowd and atmosphere around the ${focus.toLowerCase()}`,
      `Check whether the ${focus.toLowerCase()} is active right now`,
    ],
  },
  "food-dining": {
    helper: (focus) => `Ask for live lines, seating, atmosphere, or availability around ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Check the line and atmosphere at this ${focus.toLowerCase()} spot…`,
    examples: (focus) => [
      `Show the current line for the ${focus.toLowerCase()}`,
      `Check available seating and the atmosphere around the ${focus.toLowerCase()}`,
      `Capture a quick walk past the ${focus.toLowerCase()} vendors and menus`,
    ],
  },
  "car-culture": {
    helper: (focus) => `Request a safe public view of vehicles, arrivals, and activity related to ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show the ${focus.toLowerCase()} gathering from the public viewing area…`,
    examples: (focus) => [
      `Show which ${focus.toLowerCase()} vehicles have arrived`,
      `Capture a steady walk around the public ${focus.toLowerCase()} display`,
      `Check the crowd and parking near the ${focus.toLowerCase()} event`,
    ],
  },
  "street-fashion": {
    helper: (focus) => `Request a public street-level look at ${focus.toLowerCase()}, shopping activity, or event atmosphere.`,
    placeholder: (focus) => `Capture the current ${focus.toLowerCase()} scene around…`,
    examples: (focus) => [
      `Show the current ${focus.toLowerCase()} scene on the main street`,
      `Capture storefront activity connected to ${focus.toLowerCase()}`,
      `Check the crowd and arrivals for the ${focus.toLowerCase()} event`,
    ],
  },
  "events-sports": {
    helper: (focus) => `Ask for crowd size, access, score context, or atmosphere around ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show the crowd and current activity at the ${focus.toLowerCase()}…`,
    examples: (focus) => [
      `Show the entrance line for the ${focus.toLowerCase()}`,
      `Capture the current crowd and atmosphere at the ${focus.toLowerCase()}`,
      `Check parking and public access around the ${focus.toLowerCase()}`,
    ],
  },
  "nature-wildlife": {
    helper: (focus) => `Request current conditions, access, crowds, or a safe scenic view of ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show the current conditions at this ${focus.toLowerCase()} location…`,
    examples: (focus) => [
      `Show the current conditions at the ${focus.toLowerCase()}`,
      `Check the crowd and access around the ${focus.toLowerCase()}`,
      `Capture a steady panoramic view of the ${focus.toLowerCase()}`,
    ],
  },
  "real-estate": {
    helper: (focus) => `Describe the rooms, exterior details, or neighborhood views needed for ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show the property with a walkthrough focused on ${focus.toLowerCase()}…`,
    examples: (focus) => [
      `Give me a room-by-room walkthrough focused on ${focus.toLowerCase()}`,
      `Show the exterior, street, parking, and surroundings for this property`,
      `Capture the kitchen, bathrooms, storage, and visible property condition`,
    ],
  },
  nightlife: {
    helper: (focus) => `Ask for a current line, cover, crowd, or atmosphere check for ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Check the line, crowd, and atmosphere at this ${focus.toLowerCase()} venue…`,
    examples: (focus) => [
      `Show the current line and door activity for the ${focus.toLowerCase()}`,
      `Check the crowd and atmosphere around the ${focus.toLowerCase()}`,
      `Capture a quick public exterior view of the ${focus.toLowerCase()} venue`,
    ],
  },
  "tech-innovation": {
    helper: (focus) => `Request a live public demonstration or event-floor view focused on ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show me the ${focus.toLowerCase()} demonstration at…`,
    examples: (focus) => [
      `Capture a clear demonstration of the ${focus.toLowerCase()}`,
      `Show the crowd and exhibits around the ${focus.toLowerCase()}`,
      `Check whether the ${focus.toLowerCase()} demo is active right now`,
    ],
  },
  "shopping-retail": {
    helper: (focus) => `Ask for current stock, lines, pricing signs, or foot traffic related to ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Check the ${focus.toLowerCase()} situation at this store…`,
    examples: (focus) => [
      `Show the current ${focus.toLowerCase()} at the main entrance`,
      `Check shelves and signs related to ${focus.toLowerCase()}`,
      `Capture the crowd and checkout lines around the ${focus.toLowerCase()}`,
    ],
  },
  "fitness-outdoors": {
    helper: (focus) => `Request a live check of conditions, availability, or activity around ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show the current conditions and activity at the ${focus.toLowerCase()}…`,
    examples: (focus) => [
      `Show how busy the ${focus.toLowerCase()} area is right now`,
      `Check surface and weather conditions for ${focus.toLowerCase()}`,
      `Capture available space and current activity around the ${focus.toLowerCase()}`,
    ],
  },
  "pets-animals": {
    helper: (focus) => `Ask for a safe public check related to ${focus.toLowerCase()} without approaching distressed animals.`,
    placeholder: (focus) => `Show the current ${focus.toLowerCase()} situation from a safe distance…`,
    examples: (focus) => [
      `Check the current activity around the ${focus.toLowerCase()}`,
      `Capture a clear view related to the ${focus.toLowerCase()} from a safe distance`,
      `Show nearby signs, entrances, and landmarks for the ${focus.toLowerCase()}`,
    ],
  },
  "community-culture": {
    helper: (focus) => `Request a current view of attendance, access, services, or atmosphere around ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Show what is happening at the ${focus.toLowerCase()} right now…`,
    examples: (focus) => [
      `Show the current crowd and activity at the ${focus.toLowerCase()}`,
      `Check entrances, parking, and accessibility for the ${focus.toLowerCase()}`,
      `Capture a quick walkthrough of the public ${focus.toLowerCase()} area`,
    ],
  },
  "casual-irl": {
    helper: (focus) => `Describe the authentic street-level moment or local view you want from ${focus.toLowerCase()}.`,
    placeholder: (focus) => `Take me on a short live ${focus.toLowerCase()} around…`,
    examples: (focus) => [
      `Take me on a 5-minute ${focus.toLowerCase()} through the area`,
      `Show the current street atmosphere for ${focus.toLowerCase()}`,
      `Capture an unedited public view connected to ${focus.toLowerCase()}`,
    ],
  },
  "strange-sightings-ufo": {
    helper: (focus) => `Request steady, wide evidence of ${focus.toLowerCase()} with landmarks and surroundings visible.`,
    placeholder: (focus) => `Capture a steady wide view of the ${focus.toLowerCase()} and surrounding sky…`,
    examples: (focus) => [
      `Capture the ${focus.toLowerCase()} with nearby landmarks in frame`,
      `Show a steady wide view of the ${focus.toLowerCase()} and surrounding sky`,
      `Record the direction, movement, and visible duration of the ${focus.toLowerCase()}`,
    ],
  },
};

export function bountyPromptContext(
  categoryId: MainCategoryId,
  categoryLabel: string,
  subcategory: string | null,
): PromptContext {
  const blueprint = PROMPT_BLUEPRINTS[categoryId];
  const focus = focusName(subcategory, categoryLabel);
  return {
    helper: blueprint.helper(focus),
    placeholder: blueprint.placeholder(focus),
    examples: blueprint.examples(focus),
  };
}

/** Short one-tap keyword pills shown under the instruction box, keyed by category. */
export const QUICK_TAGS: Record<MainCategoryId, readonly string[]> = {
  "breaking-incidents": ["Active now", "Roads closed", "Safe distance", "Wide view"],
  "traffic-updates": ["Traffic", "Parking", "Transit", "Road closure"],
  "arts-performances": ["Line", "Crowd", "Soundcheck", "Doors open"],
  "food-dining": ["Line out the door", "Seating", "Menu", "Atmosphere"],
  "car-culture": ["Arrivals", "Parking", "Display", "Crowd"],
  "street-fashion": ["Storefront", "Drops", "Crowd", "Street style"],
  "events-sports": ["Entrance line", "Crowd", "Score", "Parking"],
  "nature-wildlife": ["Conditions", "Trail access", "Crowd", "Panorama"],
  "real-estate": ["Open house", "Interior", "Exterior", "Price sign"],
  nightlife: ["Line", "Cover", "Crowd", "Atmosphere"],
  "tech-innovation": ["Demo", "Booth", "Crowd", "Hands-on"],
  "shopping-retail": ["In stock", "Sold out", "Restock", "Shelf check"],
  "fitness-outdoors": ["Busy", "Conditions", "Equipment", "Space"],
  "pets-animals": ["Safe distance", "Activity", "Signs", "Entrance"],
  "community-culture": ["Attendance", "Access", "Services", "Atmosphere"],
  "casual-irl": ["Walkthrough", "Street view", "Crowd", "Now"],
  "strange-sightings-ufo": ["Direction", "Movement", "Duration", "Landmarks"],
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function promptHasKeyword(current: string, keyword: string): boolean {
  if (!keyword) return false;
  const pattern = new RegExp(`(^|[\\s,.;])${escapeRegExp(keyword)}([\\s,.;]|$)`, "i");
  return pattern.test(current);
}

/** Toggle a quick tag inside the instruction text: appends it, or removes it when already present. */
export function togglePromptKeyword(current: string, keyword: string): string {
  if (promptHasKeyword(current, keyword)) {
    return current
      .replace(new RegExp(`(^|[\\s,.;])${escapeRegExp(keyword)}(?=[\\s,.;]|$)`, "i"), "$1")
      .replace(/[\s,.;]{2,}/g, " ")
      .replace(/^[\s,.;]+|[\s,.;]+$/g, "");
  }
  const trimmed = current.trimEnd();
  if (!trimmed) return keyword;
  return `${trimmed}${/[,.;]$/.test(trimmed) ? " " : ", "}${keyword}`;
}