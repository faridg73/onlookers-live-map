import type { CategoryId } from "@/lib/onlooker";
import type { Venue } from "@/lib/venues";
import type { DiscoveredPlace } from "@/lib/places.functions";

/**
 * Category-first browsing that is built from live Google Places results around
 * whatever area the person is looking at, instead of a fixed list of venues.
 * Each group carries the place types used to query, plus refinement chips that
 * narrow the same query.
 */
export type DiscoverySub = {
  id: string;
  label: string;
  includedTypes: string[];
};

export type DiscoveryGroup = {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  emoji: string;
  /** Tailwind gradient classes used as the card's placeholder artwork. */
  art: string;
  /** Bounty category pre-filled when posting from a place in this group. */
  category: CategoryId;
  includedTypes: string[];
  subs: DiscoverySub[];
  /** Curated groups used when live place lookups return nothing. */
  fallbackGroups: string[];
};

export const DISCOVERY_GROUPS: DiscoveryGroup[] = [
  {
    slug: "events",
    fallbackGroups: ["entertainment", "happening"],
    name: "Trending events & live sports",
    short: "Events",
    tagline: "Stadium nights, fight cards, concerts and big gatherings",
    emoji: "\u{1F3DF}\u{FE0F}",
    art: "from-signal/40 to-orange-500/20",
    category: "events",
    includedTypes: ["stadium", "sports_complex", "concert_hall", "performing_arts_theater"],
    subs: [
      { id: "stadiums", label: "Stadiums & arenas", includedTypes: ["stadium", "sports_complex"] },
      { id: "concerts", label: "Concerts & shows", includedTypes: ["concert_hall", "performing_arts_theater"] },
      { id: "fights", label: "Fight nights & big screens", includedTypes: ["bar", "casino"] },
      { id: "festivals", label: "Festival grounds", includedTypes: ["amusement_park", "park"] },
    ],
  },
  {
    slug: "malls",
    fallbackGroups: ["malls"],
    name: "Shopping malls",
    short: "Malls",
    tagline: "Food courts, queues and stock checks",
    emoji: "\u{1F6CD}\u{FE0F}",
    art: "from-fuchsia-500/30 to-sky-500/20",
    category: "food",
    includedTypes: ["shopping_mall", "department_store"],
    subs: [
      { id: "malls", label: "Malls", includedTypes: ["shopping_mall"] },
      { id: "stores", label: "Big stores", includedTypes: ["department_store"] },
      { id: "cinemas", label: "Cinemas", includedTypes: ["movie_theater"] },
      { id: "parking", label: "Parking decks", includedTypes: ["parking"] },
    ],
  },
  {
    slug: "food",
    fallbackGroups: ["malls", "neighborhoods"],
    name: "Food & drink",
    short: "Food",
    tagline: "Wait times, patios and what the line looks like",
    emoji: "\u{1F374}",
    art: "from-amber-500/30 to-rose-500/20",
    category: "food",
    includedTypes: ["restaurant", "cafe", "bakery"],
    subs: [
      { id: "restaurants", label: "Restaurants", includedTypes: ["restaurant"] },
      { id: "cafes", label: "Cafés", includedTypes: ["cafe"] },
      { id: "bakeries", label: "Bakeries", includedTypes: ["bakery"] },
      { id: "takeaway", label: "Takeaway", includedTypes: ["meal_takeaway"] },
    ],
  },
  {
    slug: "nightlife",
    fallbackGroups: ["nightlife"],
    name: "Nightlife",
    short: "Nightlife",
    tagline: "Door lines, crowd size and the vibe right now",
    emoji: "\u{1F303}",
    art: "from-violet-500/30 to-indigo-500/20",
    category: "nightlife",
    includedTypes: ["night_club", "bar"],
    subs: [
      { id: "clubs", label: "Clubs", includedTypes: ["night_club"] },
      { id: "bars", label: "Bars", includedTypes: ["bar"] },
      { id: "casino", label: "Casinos", includedTypes: ["casino"] },
      { id: "late-eats", label: "Late-night eats", includedTypes: ["meal_takeaway"] },
    ],
  },
  {
    slug: "transit",
    fallbackGroups: ["transit", "traffic"],
    name: "Airports & transit",
    short: "Transit",
    tagline: "Security lines, platforms and pickup lanes",
    emoji: "\u{2708}\u{FE0F}",
    art: "from-sky-500/30 to-emerald-500/20",
    category: "transit",
    includedTypes: ["airport", "train_station", "subway_station", "bus_station"],
    subs: [
      { id: "airports", label: "Airports", includedTypes: ["airport"] },
      { id: "trains", label: "Train stations", includedTypes: ["train_station"] },
      { id: "metro", label: "Metro", includedTypes: ["subway_station"] },
      { id: "buses", label: "Bus stops", includedTypes: ["bus_station"] },
    ],
  },
  {
    slug: "landmarks",
    fallbackGroups: ["landmarks"],
    name: "Landmarks & museums",
    short: "Landmarks",
    tagline: "Views, entry queues and photo spots",
    emoji: "\u{1F5FC}",
    art: "from-cyan-500/30 to-blue-500/20",
    category: "events",
    includedTypes: ["tourist_attraction", "museum", "art_gallery"],
    subs: [
      { id: "attractions", label: "Attractions", includedTypes: ["tourist_attraction"] },
      { id: "museums", label: "Museums", includedTypes: ["museum"] },
      { id: "galleries", label: "Galleries", includedTypes: ["art_gallery"] },
      { id: "parks", label: "Theme parks", includedTypes: ["amusement_park"] },
    ],
  },
  {
    slug: "scenic",
    fallbackGroups: ["scenic"],
    name: "Parks & coastline",
    short: "Outdoors",
    tagline: "Surf, trails, sunsets and how packed it is",
    emoji: "\u{1F30A}",
    art: "from-emerald-500/30 to-teal-500/20",
    category: "outdoors",
    includedTypes: ["park", "beach", "hiking_area"],
    subs: [
      { id: "parks", label: "Parks", includedTypes: ["park"] },
      { id: "beaches", label: "Beaches", includedTypes: ["beach"] },
      { id: "trails", label: "Trails", includedTypes: ["hiking_area"] },
      { id: "views", label: "Lookouts", includedTypes: ["tourist_attraction"] },
    ],
  },
];

export function discoveryGroupBySlug(slug?: string) {
  return DISCOVERY_GROUPS.find((group) => group.slug === slug);
}

const PLACE_PREFIX = "gp-";

/** Route-safe slug for a live Google place. */
export function placeSlug(placeId: string) {
  return `${PLACE_PREFIX}${encodeURIComponent(placeId)}`;
}

export function placeIdFromSlug(slug?: string): string | null {
  if (!slug || !slug.startsWith(PLACE_PREFIX)) return null;
  try {
    return decodeURIComponent(slug.slice(PLACE_PREFIX.length));
  } catch {
    return null;
  }
}

function areaFromAddress(address: string) {
  const parts = address
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length <= 1) return address;
  return parts.slice(1, 3).join(", ");
}

/** Turns a live Places result into the venue shape the bounty flow expects. */
export function venueFromPlace(place: DiscoveredPlace, group: DiscoveryGroup): Venue {
  const words = place.name
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((word: string) => word.length > 3);
  return {
    slug: placeSlug(place.id),
    name: place.name,
    area: place.address ? areaFromAddress(place.address) : group.short,
    blurb: place.primaryType
      ? `${place.primaryType}${place.rating ? ` · ${place.rating.toFixed(1)}★` : ""} — ask for a live look at what's happening here right now.`
      : "Ask for a live look at what's happening here right now.",
    emoji: group.emoji,
    category: group.category,
    latitude: place.latitude,
    longitude: place.longitude,
    match: [place.name.toLowerCase(), ...words.slice(0, 2)],
  };
}
