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
  /**
   * Days of the week this spot is worth watching (0 = Sunday). Used by
   * pop-up spots like markets and tailgates so they only show when they happen.
   */
  days?: number[];
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
  {
    slug: "traffic",
    name: "Traffic & Commute",
    short: "Traffic",
    tagline: "Bottlenecks, bridge tolls and platform waits",
    emoji: "\u{1F6A6}",
    art: "from-red-500/30 to-amber-500/20",
    venues: [
      {
        slug: "the-101-downtown-slot",
        name: "US-101 Downtown Slot",
        area: "Downtown LA",
        blurb: "Southbound crawl, lane blocks and the 4th Street on-ramp queue.",
        emoji: "\u{1F697}",
        category: "transit",
        latitude: 34.0568,
        longitude: -118.242,
        match: ["101", "downtown", "freeway"],
      },
      {
        slug: "vincent-thomas-bridge",
        name: "Vincent Thomas Bridge",
        area: "San Pedro",
        blurb: "Toll plaza backup, port truck lines and the harbour view.",
        emoji: "\u{1F309}",
        category: "transit",
        latitude: 33.7529,
        longitude: -118.2646,
        match: ["vincent thomas", "bridge", "san pedro", "toll"],
      },
      {
        slug: "the-10-la-brea",
        name: "I-10 at La Brea",
        area: "Mid-City",
        blurb: "Rush-hour merge, stalled cars and how far the queue reaches.",
        emoji: "\u{1F6A7}",
        category: "transit",
        latitude: 34.0295,
        longitude: -118.3554,
        match: ["10 freeway", "la brea", "santa monica freeway"],
      },
      {
        slug: "seventh-metro-center",
        name: "7th St / Metro Center",
        area: "Downtown LA",
        blurb: "Platform crowding, next-train boards and lift outages.",
        emoji: "\u{1F687}",
        category: "transit",
        latitude: 34.0486,
        longitude: -118.2586,
        match: ["7th street", "metro center", "metro"],
      },
    ],
  },
  {
    slug: "nightlife",
    name: "Nightlife & Dining",
    short: "Nightlife",
    tagline: "Strips, restaurant rows and outdoor stages",
    emoji: "\u{1F303}",
    art: "from-purple-500/30 to-pink-500/20",
    venues: [
      {
        slug: "downtown-broadway",
        name: "Broadway Nightlife Strip",
        area: "Downtown LA",
        blurb: "Door lines, rooftop capacity and how loud the block is.",
        emoji: "\u{1F57A}",
        category: "nightlife",
        latitude: 34.0466,
        longitude: -118.2503,
        match: ["broadway", "downtown", "nightlife"],
      },
      {
        slug: "abbot-kinney",
        name: "Abbot Kinney Blvd",
        area: "Venice",
        blurb: "Restaurant waits, patio space and sidewalk crowd size.",
        emoji: "\u{1F37D}\u{FE0F}",
        category: "food",
        latitude: 33.9905,
        longitude: -118.4695,
        match: ["abbot kinney", "venice"],
      },
      {
        slug: "grand-park-stage",
        name: "Grand Park Outdoor Stage",
        area: "Civic Center",
        blurb: "Open-air sets, lawn space and how packed the front is.",
        emoji: "\u{1F3A4}",
        category: "events",
        latitude: 34.0563,
        longitude: -118.2456,
        match: ["grand park", "civic center"],
      },
      {
        slug: "koreatown-bbq-row",
        name: "Koreatown BBQ Row",
        area: "Koreatown",
        blurb: "Late-night table waits, valet lines and street parking.",
        emoji: "\u{1F356}",
        category: "food",
        latitude: 34.0616,
        longitude: -118.301,
        match: ["koreatown", "ktown", "bbq"],
      },
    ],
  },
  {
    slug: "scenic",
    name: "Weather & Lookouts",
    short: "Lookouts",
    tagline: "Surf, mountain passes and trailheads",
    emoji: "\u{1F30A}",
    art: "from-sky-500/30 to-teal-400/20",
    venues: [
      {
        slug: "malibu-surfrider",
        name: "Surfrider Beach",
        area: "Malibu",
        blurb: "Swell size, wind direction and how busy the lineup is.",
        emoji: "\u{1F3C4}",
        category: "weather",
        latitude: 34.0369,
        longitude: -118.6773,
        match: ["malibu", "surfrider", "surf"],
      },
      {
        slug: "el-porto",
        name: "El Porto",
        area: "Manhattan Beach",
        blurb: "Morning glass-off, fog bank and parking lot space.",
        emoji: "\u{1F30A}",
        category: "weather",
        latitude: 33.9019,
        longitude: -118.4223,
        match: ["el porto", "manhattan beach", "surf"],
      },
      {
        slug: "angeles-crest",
        name: "Angeles Crest Pass",
        area: "Angeles National Forest",
        blurb: "Snow on the road, closures and visibility at altitude.",
        emoji: "\u{1F3D4}\u{FE0F}",
        category: "weather",
        latitude: 34.2678,
        longitude: -118.1119,
        match: ["angeles crest", "mountain", "pass", "snow"],
      },
      {
        slug: "runyon-trailhead",
        name: "Runyon Canyon Trailhead",
        area: "Hollywood Hills",
        blurb: "Trail traffic, gate parking and haze over the basin.",
        emoji: "\u{1F97E}",
        category: "outdoors",
        latitude: 34.1055,
        longitude: -118.3503,
        match: ["runyon", "canyon", "trail"],
      },
    ],
  },
  {
    slug: "happening",
    name: "Happening Now",
    short: "Events",
    tagline: "Markets, street fairs and tailgates by the day",
    emoji: "\u{1F389}",
    art: "from-orange-500/30 to-lime-400/20",
    venues: [
      {
        slug: "hollywood-farmers-market",
        name: "Hollywood Farmers Market",
        area: "Ivar & Selma",
        blurb: "Stall lines, produce left and where to park nearby.",
        emoji: "\u{1F345}",
        category: "food",
        latitude: 34.1,
        longitude: -118.3287,
        match: ["farmers market", "hollywood"],
        days: [0],
      },
      {
        slug: "smorgasburg-la",
        name: "Smorgasburg LA",
        area: "Downtown LA",
        blurb: "Food stall waits, shade and how deep the crowd runs.",
        emoji: "\u{1F32E}",
        category: "food",
        latitude: 34.0245,
        longitude: -118.2312,
        match: ["smorgasburg", "row dtla"],
        days: [0],
      },
      {
        slug: "melrose-trading-post",
        name: "Melrose Trading Post",
        area: "Fairfax High",
        blurb: "Vendor rows, entry queue and what's still on the tables.",
        emoji: "\u{1F576}\u{FE0F}",
        category: "art",
        latitude: 34.0836,
        longitude: -118.3614,
        match: ["melrose", "trading post", "flea"],
        days: [0],
      },
      {
        slug: "sofi-tailgate",
        name: "SoFi Stadium Tailgate Lots",
        area: "Inglewood",
        blurb: "Lot fill-up, grill setups and the walk-in gate line.",
        emoji: "\u{1F3C8}",
        category: "sports",
        latitude: 33.9535,
        longitude: -118.3392,
        match: ["sofi", "tailgate", "inglewood"],
        days: [0, 1, 4],
      },
      {
        slug: "abbot-kinney-first-fridays",
        name: "First Fridays Street Fair",
        area: "Abbot Kinney, Venice",
        blurb: "Food trucks, stage sets and how far the fair stretches.",
        emoji: "\u{1F3AA}",
        category: "events",
        latitude: 33.9899,
        longitude: -118.4681,
        match: ["first fridays", "abbot kinney", "street fair"],
        days: [5],
      },
      {
        slug: "dtla-artwalk",
        name: "Downtown Art Walk",
        area: "Historic Core",
        blurb: "Gallery openings, sidewalk crowds and street closures.",
        emoji: "\u{1F3A8}",
        category: "art",
        latitude: 34.0459,
        longitude: -118.2489,
        match: ["art walk", "historic core"],
        days: [4],
      },
    ],
  },
];

export function groupBySlug(slug?: string) {
  return VENUE_GROUPS.find((g) => g.slug === slug);
}

/** True when a pop-up spot is worth watching today (always true for fixed places). */
export function isVenueOnToday(venue: Venue, today: number = new Date().getDay()) {
  return !venue.days || venue.days.includes(today);
}

export const ALL_VENUES: Venue[] = VENUE_GROUPS.flatMap((group) => group.venues);

export function venueBySlug(groupSlug?: string, venueSlug?: string) {
  return groupBySlug(groupSlug)?.venues.find((v) => v.slug === venueSlug);
}
