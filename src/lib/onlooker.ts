export type RequestStatus = "open" | "claimed" | "fulfilled";

export type LiveRequest = {
  id: string;
  title: string;
  place: string;
  note: string;
  bounty: number;
  status: RequestStatus;
  minutesAgo: number;
  watchers: number;
  responses: number;
  expiresInMin: number;
  requester: string;
  /** map coordinates in the 0-1000 city space */
  x: number;
  y: number;
};

export const SEED_REQUESTS: LiveRequest[] = [
  {
    id: "r1",
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
};

export function formatAgo(min: number) {
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  return `${Math.floor(min / 60)}h ago`;
}
