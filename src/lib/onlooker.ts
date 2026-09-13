export type RequestStatus = "open" | "claimed" | "fulfilled" | "expired";

export type CategoryId =
  | "food"
  | "vehicles"
  | "outdoors"
  | "nightlife"
  | "transit"
  | "events"
  | "parking"
  | "weather"
  | "realestate"
  | "art"
  | "sports"
  | "street"
  | "community"
  | "markets";

/** A refinement inside a category. `category` re-maps the stored category. */
export type SubOption = { id: string; label: string; category?: CategoryId };

export type Category = {
  id: CategoryId;
  label: string;
  /** Compact label used in tight grids */
  short: string;
  emoji: string;
  /** Prompt shown inside the instructions box for this category */
  hint: string;
  subs: SubOption[];
};

export const CATEGORIES: Category[] = [
  { id: "food", label: "Food & Dining", short: "Food", emoji: "\u{1F37D}\u{FE0F}", hint: "e.g. Show the line at the door, the menu board, and whether the patio has free tables.", subs: [
    { id: "wait", label: "Wait time" },
    { id: "menu", label: "Menu & prices" },
    { id: "seating", label: "Seating / patio" },
    { id: "drivethru", label: "Drive-thru" },
    { id: "market", label: "Market & groceries" },
  ] },
  { id: "vehicles", label: "Cars & Vehicles", short: "Vehicles", emoji: "\u{1F697}", hint: "e.g. Cold start engine sound, 360\u00B0 walkaround, odometer photo, any dents or rust.", subs: [
    { id: "walkaround", label: "Walkaround" },
    { id: "engine", label: "Cold start / engine" },
    { id: "interior", label: "Interior & odometer" },
    { id: "damage", label: "Damage & rust" },
    { id: "boat", label: "Boats & RVs" },
  ] },
  { id: "outdoors", label: "Nature & Trails", short: "Outdoors", emoji: "\u{1F3DE}\u{FE0F}", hint: "e.g. Trail conditions at the north gate, how muddy it is, and the view from the ridge.", subs: [
    { id: "trail", label: "Trail conditions" },
    { id: "beach", label: "Beach & surf" },
    { id: "crowd", label: "How busy" },
    { id: "wildlife", label: "Wildlife" },
    { id: "view", label: "Scenic view" },
  ] },
  { id: "nightlife", label: "Nightlife & Bars", short: "Nightlife", emoji: "\u{1F378}", hint: "e.g. How long is the queue, is there a cover charge, how busy is it inside.", subs: [
    { id: "queue", label: "Line & wait" },
    { id: "cover", label: "Cover charge" },
    { id: "vibe", label: "Crowd & vibe" },
    { id: "music", label: "Music / DJ" },
    { id: "dresscode", label: "Dress code" },
  ] },
  { id: "transit", label: "Transit & Traffic", short: "Transit", emoji: "\u{1F686}", hint: "e.g. Photo of the departure board and how backed up the road is heading north.", subs: [
    { id: "traffic", label: "Road traffic" },
    { id: "board", label: "Departure board" },
    { id: "station", label: "Station crowding" },
    { id: "airport", label: "Airport lines" },
    { id: "closure", label: "Closures & detours" },
  ] },
  { id: "events", label: "Events & Venues", short: "Events", emoji: "\u{1F3AB}", hint: "e.g. How long the entry line is, how full the lot is, and the tailgate scene outside the gates.", subs: [
    { id: "lines", label: "Line Lengths" },
    { id: "parking", label: "Parking Availability" },
    { id: "merch", label: "Merch Truck Stock" },
    { id: "tailgate", label: "Tailgate Hype" },
    { id: "rideshare", label: "Rideshare Wait Times" },
  ] },
  { id: "parking", label: "Parking", short: "Parking", emoji: "\u{1F17F}\u{FE0F}", hint: "e.g. Wide shot of the lot, how many spots are open, and the posted hourly rate.", subs: [
    { id: "street", label: "Street parking" },
    { id: "lot", label: "Lot & garage" },
    { id: "rates", label: "Rates & signs" },
    { id: "ev", label: "EV charging" },
    { id: "accessible", label: "Accessible spots" },
  ] },
  { id: "weather", label: "Weather & Conditions", short: "Weather", emoji: "\u{26C5}", hint: "e.g. Is the underpass flooded, how deep is the water, is the road still passable.", subs: [
    { id: "flooding", label: "Flooding" },
    { id: "snow", label: "Snow & ice" },
    { id: "wind", label: "Wind & storm" },
    { id: "smoke", label: "Smoke & haze" },
    { id: "sky", label: "Sky right now" },
  ] },
  { id: "realestate", label: "Real Estate & Open Houses", short: "Real Estate", emoji: "\u{1F3E1}", hint: "e.g. Walk the open house room by room, show the yard, note damp spots and street noise.", subs: [
    { id: "openhouse", label: "Open house walk" },
    { id: "exterior", label: "Exterior & yard" },
    { id: "condition", label: "Condition & damp" },
    { id: "street", label: "Street & noise" },
    { id: "rental", label: "Rental viewing" },
  ] },
  { id: "art", label: "Art Galleries & Exhibits", short: "Art", emoji: "\u{1F5BC}\u{FE0F}", hint: "e.g. Which pieces are on show, how busy the room is, and whether photography is allowed.", subs: [
    { id: "onshow", label: "What's on show" },
    { id: "busy", label: "How busy" },
    { id: "photos", label: "Photo rules" },
  ] },
  { id: "sports", label: "Sporting & Events", short: "Sports", emoji: "\u{1F3DF}\u{FE0F}", hint: "e.g. Crowd size, view from the seats, queue at the gate and the score right now.", subs: [
    { id: "score", label: "Score right now" },
    { id: "seatview", label: "View from seats" },
    { id: "crowd", label: "Crowd & queue" },
  ] },
  { id: "street", label: "Street & Park Performances", short: "Performances", emoji: "\u{1F3B8}", hint: "e.g. The busker's crowd size and energy from the public footpath. Open streets and parks only — never record a ticketed or private performance.", subs: [
    { id: "buskers", label: "Buskers & musicians" },
    { id: "parkshows", label: "Park shows" },
    { id: "popupart", label: "Pop-up art" },
    { id: "crowdsize", label: "Crowd & vibe" },
  ] },
  { id: "community", label: "Community Rescues & Public Phenomena", short: "Community", emoji: "\u{1F6A8}", hint: "e.g. A wide shot of the closed street from a safe public distance. Public streets and parks only — no private property, no confidential response details.", subs: [
    { id: "petrescue", label: "Pet rescues" },
    { id: "response", label: "Public response" },
    { id: "alert", label: "Community alert" },
    { id: "lostfound", label: "Lost & found" },
  ] },
  { id: "markets", label: "Local Markets & Pop-ups", short: "Markets", emoji: "\u{1F3EA}", hint: "e.g. Which stalls are set up, how long the lines are and the general crowd from the public walkway.", subs: [
    { id: "farmers", label: "Farmers markets" },
    { id: "foodtrucks", label: "Food trucks" },
    { id: "blockparty", label: "Block parties" },
    { id: "popupstalls", label: "Pop-up stalls" },
  ] },
];

/**
 * The nine tiles shown in the 3x3 picker on both /feed and /post. Art and
 * sports stay valid stored categories, reachable as sub-options of Events.
 */
export const PRIMARY_CATEGORY_IDS: CategoryId[] = [
  "food",
  "vehicles",
  "outdoors",
  "nightlife",
  "transit",
  "events",
  "parking",
  "weather",
  "realestate",
];

export const PRIMARY_CATEGORIES: Category[] = PRIMARY_CATEGORY_IDS.map(
  (id) => CATEGORIES.find((c) => c.id === id)!,
);

export function subOptionsFor(id?: CategoryId | null): SubOption[] {
  return (id && CATEGORIES.find((c) => c.id === id)?.subs) || [];
}

export function subOptionById(categoryId: CategoryId, subId?: string | null) {
  return subId ? subOptionsFor(categoryId).find((s) => s.id === subId) : undefined;
}

/** Categories that require written permission from an owner or agent first. */
export const PERMISSION_REQUIRED_CATEGORIES: CategoryId[] = ["realestate"];

export function needsPermissionConfirmation(id?: CategoryId | null) {
  return !!id && PERMISSION_REQUIRED_CATEGORIES.includes(id);
}

export function categoryById(id?: CategoryId | null) {
  return CATEGORIES.find((c) => c.id === id);
}

/**
 * Restricted categories happen on private property (homes, vehicles, boats,
 * yards), so the requester sets a private access passcode the onlooker can
 * quote on site if anyone asks who authorised them to be there.
 */
export const PRIVATE_ACCESS_CATEGORIES: CategoryId[] = ["realestate", "vehicles"];

export function needsAccessCode(id?: CategoryId | null) {
  return !!id && PRIVATE_ACCESS_CATEGORIES.includes(id);
}

/** Six-digit passcode, avoiding leading-zero confusion when read aloud. */
export function generateAccessCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

export type LiveRequest = {
  id: string;
  /** Database id of the escrowed request, when it was posted by this user */
  dbId?: string | undefined;
  title: string;
  category?: CategoryId | undefined;
  /** Free-form instructions written by the requester */
  instructions?: string | undefined;
  /** Private access passcode, only revealed once the bounty is claimed */
  accessCode?: string | undefined;
  place: string;
  note: string;
  bounty: number;
  status: RequestStatus;
  minutesAgo: number;
  watchers: number;
  responses: number;
  expiresInMin: number;
  /** Absolute deadline in epoch ms; derived from expiresInMin when the app loads */
  expiresAt?: number | undefined;
  requester: string;
  /** map coordinates in the 0-1000 city space */
  x: number;
  y: number;
};

export type MapPosition = { lat: number; lng: number };

export const REGIONAL_CENTER: MapPosition = { lat: 34.0522, lng: -118.2437 };
const REGION_SPAN = 0.3;

/** Turn a stored 0-1000 map-space point back into real coordinates. */
export function requestMapPosition(request: Pick<LiveRequest, "x" | "y">): MapPosition {
  const clampedX = Math.min(1000, Math.max(0, request.x));
  const clampedY = Math.min(1000, Math.max(0, request.y));
  return {
    lat: REGIONAL_CENTER.lat + REGION_SPAN / 2 - (clampedY / 1000) * REGION_SPAN,
    lng: REGIONAL_CENTER.lng - REGION_SPAN / 2 + (clampedX / 1000) * REGION_SPAN,
  };
}

/** Straight-line distance between two map positions, in miles. */
export function distanceMiles(from: MapPosition, to: MapPosition) {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const earthRadiusMiles = 3958.8;
  const latitudeDelta = radians(to.lat - from.lat);
  const longitudeDelta = radians(to.lng - from.lng);
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(longitudeDelta / 2) ** 2;
  return 2 * earthRadiusMiles * Math.asin(Math.sqrt(a));
}

export const SEED_REQUESTS: LiveRequest[] = [
  {
    id: "r1",
    category: "transit",
    title: "How long is the ferry line?",
    place: "Pier 41 Terminal",
    note: "Trying to decide if I should walk over now or wait it out.",
    bounty: 12,
    status: "open",
    minutesAgo: 2,
    watchers: 34,
    responses: 0,
    expiresInMin: 18,
    requester: "mara.k",
    x: 214,
    y: 268,
  },
  {
    id: "r2",
    category: "nightlife",
    title: "Is the night market still open?",
    place: "Ash Alley & 6th",
    note: "Photo of the entrance would be perfect. Any angle.",
    bounty: 8,
    status: "open",
    minutesAgo: 6,
    watchers: 21,
    responses: 1,
    expiresInMin: 44,
    requester: "tobi",
    x: 604,
    y: 412,
  },
  {
    id: "r3",
    category: "outdoors",
    title: "Sunset from the east ridge?",
    place: "Ridgeline Overlook",
    note: "Want to know if the fog rolled in before I drive up.",
    bounty: 25,
    status: "claimed",
    minutesAgo: 11,
    watchers: 88,
    responses: 2,
    expiresInMin: 9,
    requester: "elena.v",
    x: 812,
    y: 178,
  },
  {
    id: "r4",
    category: "parking",
    title: "Any parking left in Lot C?",
    place: "Harbor Stadium Lot C",
    note: "Game starts in 40. A wide shot of the lot helps.",
    bounty: 15,
    status: "open",
    minutesAgo: 14,
    watchers: 52,
    responses: 0,
    expiresInMin: 26,
    requester: "d.rosco",
    x: 428,
    y: 690,
  },
  {
    id: "r5",
    category: "weather",
    title: "Street flooded after the storm?",
    place: "Lowell & Canal",
    note: "Neighbours reporting water. Need eyes on the underpass.",
    bounty: 30,
    status: "open",
    minutesAgo: 19,
    watchers: 140,
    responses: 3,
    expiresInMin: 55,
    requester: "civic.watch",
    x: 726,
    y: 742,
  },
  {
    id: "r6",
    category: "outdoors",
    title: "Cherry trees blooming yet?",
    place: "Verona Park, north gate",
    note: "One photo of the north path is all I need.",
    bounty: 6,
    status: "fulfilled",
    minutesAgo: 33,
    watchers: 12,
    responses: 4,
    expiresInMin: 0,
    requester: "jun",
    x: 296,
    y: 522,
  },
];

export const statusLabel: Record<RequestStatus, string> = {
  open: "Open",
  claimed: "Claimed",
  fulfilled: "Fulfilled",
  expired: "Expired",
};

export function formatAgo(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}
