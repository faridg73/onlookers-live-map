import { MIN_BOUNTY } from "@/lib/bounty-escrow";

/** `null` duration means an open-ended continuous live feed. */
export type CaptureDuration = number | null;

export type CaptureOption = {
  id: string;
  label: string;
  minutes: CaptureDuration;
};

/** Selectable capture lengths shown in the post wizard. */
export const CAPTURE_OPTIONS: CaptureOption[] = [
  { id: "live", label: "Live Feed", minutes: null },
  { id: "1", label: "1 Min", minutes: 1 },
  { id: "3", label: "3 Min", minutes: 3 },
  { id: "5", label: "5 Min", minutes: 5 },
];

export const MAX_CAPTURE_MINUTES = 60;

/** Credits added on top of the base reward for each minute past the first. */
const CREDITS_PER_EXTRA_MINUTE = 8;

/** Continuous live feeds ask more upfront because the session stays open. */
const LIVE_FEED_CREDITS = MIN_BOUNTY * 4;

/** Smallest sensible reward for a given capture length, rounded to whole dollars. */
export function suggestedBountyForCapture(minutes: CaptureDuration): number {
  if (minutes === null) return LIVE_FEED_CREDITS;
  const clamped = Math.max(1, Math.min(MAX_CAPTURE_MINUTES, Math.round(minutes)));
  const raw = MIN_BOUNTY + (clamped - 1) * CREDITS_PER_EXTRA_MINUTE;
  return Math.ceil(raw / 4) * 4;
}

/** Human label used in cards, escrow notes and hunter instructions. */
export function captureDurationLabel(minutes: CaptureDuration): string {
  if (minutes === null) return "Continuous live feed";
  return `${minutes} min clip`;
}
