import type { CategoryId } from "@/lib/onlooker";

/**
 * Visual, category-first browsing for the live-view network: a small tier of
 * broad place groups, each holding real-world style venues people request
 * views of. Selecting a venue pre-fills the bounty flow with its coordinates.
 */
export type Venue = {
  slug: string;
  name: string;
  area: string;
  blurb: string;
  emoji: string;
  /** Default bounty category used when posting from this venue. */
  category: CategoryId;
  latitude: number;
  longitude: number;
  /** Keywords used to surface matching live requests on the venue page. */
  match: string[];
};

export type VenueGroup = {
  slug: string;
  name: string;
  short: string;
  tagline: string;
  emoji: string;
  /** Tailwind gradient classes used as the card's placeholder artwork. */
  art: string;
  venues: Venue[];
};

export const VENUE_GROUPS: VenueGroup[] = [
  {
    slug: "malls",
    name: "Shopping Malls",
    short: "Malls",
    tagline: "Food courts, queues and stock checks",
    emoji: "\u{1F6CD}\u{FE0F}",
    art: "from-fuchsia-500/30 to-sky-500/20",
    venues: [
      {
        slug: "the-grove",
        name: "The Grove",
        area: "Fairfax District",
        blurb: "Fountain plaza, trolley line and the busiest weekend food court.",
        emoji: "\u{1F3AA}",
        category: "food",
        latitude: 34.0722,
        longitude: -118.3573,
        match: ["grove", "fairfax"],
      },
      {
        slug: "westfield-century-city",
        name: "Westfield Century City",
        area: "Century City",
        blurb: "Open-air dining terrace, cinema queues and rooftop parking levels.",
        emoji: "\u{1F374}",
        category: "food",
        latitude: 34.0583,
        longitude: -118.4173,
        match: ["century city", "westfield"],
      },
      {
        slug: "santa-monica-place",
        name: "Santa Monica Place",
        area: "Downtown Santa Monica",
        blurb: "Third Street crowds, rooftop market and the ocean-view deck.",
        emoji: "\u{1F30A}",
        category: "food",
        latitude: 34.0136,
        longitude: -118.4919,
        match: ["santa monica", "third street"],
      },
      {
        slug: "beverly-center",
        name: "Beverly Center",
        area: "Beverly Grove",
        blurb: "Eight levels, valet line and the La Cienega garage entrance.",
        emoji: "\u{1F17F}\u{FE0F}",
        category: "parking",
        latitude: 34.0757,
        longitude: -118.3767,
        match: ["beverly center", "la cienega"],
      },
    ],
  },
  {
    slug: "transit",
    name: "Transit Hubs",
    short: "Transit",
    tagline: "Boards, platforms and security lines",
    emoji: "\u{1F686}",
    art: "from-emerald-500/30 to-cyan-500/20",
    venues: [
      {
        slug: "lax-terminal-b",
        name: "LAX Tom Bradley Terminal",
        area: "Los Angeles International",
        blurb: "Check-in desks, security wait and the arrivals meeting point.",
        emoji: "\u{2708}\u{FE0F}",
        category: "transit",
        latitude: 33.9425,
        longitude: -118.4081,
        match: ["lax", "airport", "terminal"],
      },
      {
        slug: "union-station",
        name: "Union Station",
        area: "Downtown LA",
        blurb: "Departure boards, Metro platforms and the Alameda taxi rank.",
        emoji: "\u{1F687}",
        category: "transit",
        latitude: 34.0562,
        longitude: -118.2365,
        match: ["union station", "metro"],
      },
      {
        slug: "the-405-sepulveda",
        name: "I-405 at Sepulveda Pass",
        area: "Brentwood",
        blurb: "Northbound backup, lane closures and the ramp meter queue.",
        emoji: "\u{1F6A7}",
        category: "transit",
        latitude: 34.0995,
        longitude: -118.4737,
        match: ["405", "sepulveda", "freeway"],
      },
    ],
  },
  {
    slug: "entertainment",
    name: "Entertainment",
    short: "Shows",
    tagline: "Venues, gigs, games and nightlife",
    emoji: "\u{1F3AB}",
    art: "from-amber-500/30 to-rose-500/20",
    venues: [
      {
        slug: "crypto-arena",
        name: "Crypto.com Arena",
        area: "South Park",
        blurb: "Gate lines, merch stands and the view from the upper bowl.",
        emoji: "\u{1F3C0}",
        category: "sports",
        latitude: 34.043,
        longitude: -118.2673,
        match: ["arena", "crypto", "lakers"],
      },
      {
        slug: "hollywood-bowl",
        name: "Hollywood Bowl",
        area: "Hollywood Hills",
        blurb: "Shuttle stop, picnic terraces and the stage sightline.",
        emoji: "\u{1F3B6}",
        category: "events",
        latitude: 34.1122,
        longitude: -118.3391,
        match: ["bowl", "hollywood"],
      },
      {
        slug: "sunset-strip",
        name: "Sunset Strip",
        area: "West Hollywood",
        blurb: "Door lines, cover charges and how full each room looks.",
        emoji: "\u{1F378}",
        category: "nightlife",
        latitude: 34.0908,
        longitude: -118.3856,
        match: ["sunset", "strip", "west hollywood"],
      },
    ],
  },
  {
    slug: "landmarks",
    name: "Landmarks",
    short: "Landmarks",
    tagline: "Views, crowds and photo spots",
    emoji: "\u{1F5FD}",
    art: "from-lime-400/30 to-emerald-500/20",
    venues: [
      {
        slug: "griffith-observatory",
        name: "Griffith Observatory",
        area: "Griffith Park",
        blurb: "Parking, haze over the basin and the sign viewpoint.",
        emoji: "\u{1F52D}",
        category: "outdoors",
        latitude: 34.1184,
        longitude: -118.3004,
        match: ["griffith", "observatory"],
      },
      {
        slug: "venice-boardwalk",
        name: "Venice Boardwalk",
        area: "Venice Beach",
        blurb: "Surf conditions, skate park action and boardwalk crowd size.",
        emoji: "\u{1F3D6}\u{FE0F}",
        category: "outdoors",
        latitude: 33.985,
        longitude: -118.4695,
        match: ["venice", "boardwalk", "beach"],
      },
      {
        slug: "walk-of-fame",
        name: "Hollywood Walk of Fame",
        area: "Hollywood Blvd",
        blurb: "Foot traffic, street performers and closures near the theatre.",
        emoji: "\u{2B50}",
        category: "events",
        latitude: 34.1016,
        longitude: -118.3269,
        match: ["walk of fame", "hollywood blvd"],
      },
    ],
  },
  {
    slug: "neighborhoods",
    name: "Neighborhoods",
    short: "Areas",
    tagline: "Streets, listings and local conditions",
    emoji: "\u{1F3D8}\u{FE0F}",
    art: "from-indigo-500/30 to-violet-500/20",
    venues: [
      {
        slug: "silver-lake",
        name: "Silver Lake",
        area: "East side",
        blurb: "Reservoir loop, brunch waits and street parking pressure.",
        emoji: "\u{1F333}",
        category: "parking",
        latitude: 34.0869,
        longitude: -118.2702,
        match: ["silver lake", "reservoir"],
      },
      {
        slug: "downtown-arts",
        name: "Arts District",
        area: "Downtown LA",
        blurb: "Gallery openings, murals and loft open houses.",
        emoji: "\u{1F5BC}\u{FE0F}",
        category: "art",
        latitude: 34.0407,
        longitude: -118.2337,
        match: ["arts district", "downtown"],
      },
      {
        slug: "pasadena-old-town",
        name: "Old Town Pasadena",
        area: "Pasadena",
        blurb: "Colorado Blvd crowds, garage space and patio seating.",
        emoji: "\u{1F35D}",
        category: "food",
        latitude: 34.1459,
        longitude: -118.1504,
        match: ["pasadena", "colorado blvd", "old town"],
      },
    ],
  },
];

export function groupBySlug(slug?: string) {
  return VENUE_GROUPS.find((g) => g.slug === slug);
}

export function venueBySlug(groupSlug?: string, venueSlug?: string) {
  return groupBySlug(groupSlug)?.venues.find((v) => v.slug === venueSlug);
}
