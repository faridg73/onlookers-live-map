export type RequestAction = "live" | "clip" | "meetup";

export type ParsedRequestIntent = {
  action: RequestAction;
  durationMinutes: number | null;
  venue: string;
  locationContext: string;
  title: string;
  instructions: string;
};

const KNOWN_VENUES = [
  "Fashion Island",
  "South Coast Plaza",
  "Neiman Marcus",
  "Nordstrom",
  "Bloomingdale's",
  "Orange Coast College",
  "Santiago Canyon College",
];

function sentenceCase(value: string) {
  const clean = value.trim().replace(/[.!?]+$/, "");
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "";
}

export function parseRequestIntent(prompt: string): ParsedRequestIntent {
  const clean = prompt.trim().replace(/\s+/g, " ");
  const lower = clean.toLowerCase();
  const durationMatch = lower.match(/\b(\d{1,3})\s*(?:-|\s)?(minute|min|hour|hr)s?\b/);
  const durationMinutes = durationMatch
    ? Math.min(180, Number(durationMatch[1]) * (/hour|hr/.test(durationMatch[2] ?? "") ? 60 : 1))
    : null;
  const action: RequestAction = /flash\s*(?:meetup|meet)|meet\s*up/.test(lower)
    ? "meetup"
    : /\b(?:go|start|stream)\s+live\b|\blive\s+stream\b/.test(lower)
      ? "live"
      : "clip";
  const known = KNOWN_VENUES.find((name) => lower.includes(name.toLowerCase()));
  const atMatch = clean.match(/\b(?:at|inside|outside|near)\s+([^,.!?]+?)(?:\s+(?:in|at|near)\s+([^,.!?]+))?[.!?]?$/i);
  const venue = known ?? atMatch?.[1]?.trim() ?? "";
  const locationContext = atMatch?.[2]?.trim() ?? "";
  const withoutLead = clean.replace(/^I\s+(?:want|need|would like)\s+/i, "");
  const title = sentenceCase(withoutLead || clean);
  const durationText = durationMinutes ? `${durationMinutes}-minute ` : "short ";
  const instructions = action === "meetup"
    ? `Show the meetup location and current atmosphere from a lawful public area. ${clean}`
    : `Capture a ${durationText}${action === "live" ? "live view" : "video clip"} using the outward-facing camera. ${clean}`;

  return { action, durationMinutes, venue, locationContext, title, instructions };
}

export const VENUE_QUICK_SEARCHES = [
  { label: "Fashion Island", query: "Fashion Island Newport Beach" },
  { label: "South Coast Plaza", query: "South Coast Plaza Costa Mesa" },
  { label: "Neiman Marcus", query: "Neiman Marcus Orange County" },
  { label: "Nordstrom", query: "Nordstrom Orange County" },
  { label: "Bloomingdale's", query: "Bloomingdale's Orange County" },
  { label: "Orange Coast College", query: "Orange Coast College" },
  { label: "Santiago Canyon College", query: "Santiago Canyon College" },
] as const;