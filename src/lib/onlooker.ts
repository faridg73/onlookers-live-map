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
  | "sports";

export type Category = {
  id: CategoryId;
  label: string;
  emoji: string;
  /** Prompt shown inside the instructions box for this category */
  hint: string;
};

export const CATEGORIES: Category[] = [
  { id: "food", label: "Food & Dining", emoji: "\u{1F37D}\u{FE0F}", hint: "e.g. Show the line at the door, the menu board, and whether the patio has free tables." },
  { id: "vehicles", label: "Cars & Vehicles", emoji: "\u{1F697}", hint: "e.g. Cold start engine sound, 360\u00B0 walkaround, odometer photo, any dents or rust." },
  { id: "outdoors", label: "Nature & Trails", emoji: "\u{1F3DE}\u{FE0F}", hint: "e.g. Trail conditions at the north gate, how muddy it is, and the view from the ridge." },
  { id: "nightlife", label: "Nightlife & Bars", emoji: "\u{1F378}", hint: "e.g. How long is the queue, is there a cover charge, how busy is it inside." },
  { id: "transit", label: "Transit & Traffic", emoji: "\u{1F686}", hint: "e.g. Photo of the departure board and how backed up the road is heading north." },
  { id: "events", label: "Events & Concerts", emoji: "\u{1F3AB}", hint: "e.g. Crowd size at the gate, stage view from the back, merch line length." },
  { id: "parking", label: "Parking", emoji: "\u{1F17F}\u{FE0F}", hint: "e.g. Wide shot of the lot, how many spots are open, and the posted hourly rate." },
  { id: "weather", label: "Weather & Conditions", emoji: "\u{26C5}", hint: "e.g. Is the underpass flooded, how deep is the water, is the road still passable." },
  { id: "realestate", label: "Real Estate & Open Houses", emoji: "\u{1F3E1}", hint: "e.g. Walk the open house room by room, show the yard, note damp spots and street noise." },
  { id: "art", label: "Art Galleries & Exhibits", emoji: "\u{1F5BC}\u{FE0F}", hint: "e.g. Which pieces are on show, how busy the room is, and whether photography is allowed." },
  { id: "sports", label: "Sporting & Events", emoji: "\u{1F3DF}\u{FE0F}", hint: "e.g. Crowd size, view from the seats, queue at the gate and the score right now." },
];

/** Categories that require written permission from an owner or agent first. */
export const PERMISSION_REQUIRED_CATEGORIES: CategoryId[] = ["realestate"];

export function needsPermissionConfirmation(id?: CategoryId | null) {
  return !!id && PERMISSION_REQUIRED_CATEGORIES.includes(id);
}

export function categoryById(id?: CategoryId | null) {
  return CATEGORIES.find((c) => c.id === id);
}

export type LiveRequest = {
  id: string;
  /** Database id of the escrowed request, when it was posted by this user */
  dbId?: string | undefined;
  title: string;
  category?: CategoryId | undefined;
  /** Free-form instructions written by the requester */
  instructions?: string | undefined;
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
