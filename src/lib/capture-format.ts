// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { CREDITS_PER_USD, usdToCredits } from "@/lib/credits";

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
  { id: "1", label: "1 min", minutes: 1 },
  { id: "5", label: "5 min", minutes: 5 },
  { id: "10", label: "10 min", minutes: 10 },
  { id: "30", label: "30 min", minutes: 30 },
  { id: "60", label: "60 min", minutes: 60 },
];

export const MAX_CAPTURE_MINUTES = 60;

/* ------------------------------------------------------------------
 * Gig-economy pricing: every task pays a fixed dispatch fee plus an
 * hourly time rate, with an absolute minimum payout floor so even the
 * quickest job is worth the onlooker's stop.
 * ------------------------------------------------------------------ */

/** Fixed dispatch / activation fee added to every task ($5.00 = 20 credits). */
export const GIG_BASE_FEE_USD = 5;
export const GIG_BASE_FEE_CREDITS = GIG_BASE_FEE_USD * CREDITS_PER_USD;

/** Time rate: $50 per hour (~$0.83 per minute). */
export const GIG_RATE_USD_PER_HOUR = 50;
export const GIG_RATE_USD_PER_MINUTE = GIG_RATE_USD_PER_HOUR / 60;

/** Absolute minimum payout floor ($10.00 = 40 credits), applied to 1–5 min tasks. */
export const GIG_MIN_PAYOUT_USD = 10;
export const GIG_MIN_PAYOUT_CREDITS = GIG_MIN_PAYOUT_USD * CREDITS_PER_USD;

/** Open-ended live feeds are priced as a 15-minute session block. */
export const GIG_LIVE_BLOCK_MINUTES = 15;

export type GigQuote = {
  minutes: number;
  baseFeeUsd: number;
  baseFeeCredits: number;
  timeUsd: number;
  timeCredits: number;
  /** True when the $10 minimum floor lifted the total. */
  floored: boolean;
  totalUsd: number;
  totalCredits: number;
};

const round2 = (value: number) => Math.round(value * 100) / 100;

/**
 * Base Fee + Time Rate = Total Payout. Durations of 1–5 minutes lock at the
 * $10 minimum floor; longer tasks pay the fee plus $50/hour for their minutes.
 */
export function gigQuoteForMinutes(minutes: number): GigQuote {
  const mins = Math.max(1, Math.round(Number.isFinite(minutes) ? minutes : 1));
  const timeUsd = round2(mins * GIG_RATE_USD_PER_MINUTE);
  const rawUsd = round2(GIG_BASE_FEE_USD + timeUsd);
  const floored = rawUsd < GIG_MIN_PAYOUT_USD;
  const totalUsd = floored ? GIG_MIN_PAYOUT_USD : rawUsd;
  return {
    minutes: mins,
    baseFeeUsd: GIG_BASE_FEE_USD,
    baseFeeCredits: GIG_BASE_FEE_CREDITS,
    timeUsd,
    timeCredits: usdToCredits(timeUsd),
    floored,
    totalUsd,
    totalCredits: usdToCredits(totalUsd),
  };
}

/** Suggested reward for a given capture length, using the gig pricing algorithm. */
export function suggestedBountyForCapture(minutes: CaptureDuration): number {
  return gigQuoteForMinutes(minutes ?? GIG_LIVE_BLOCK_MINUTES).totalCredits;
}

/** Human label used in cards, escrow notes and hunter instructions. */
export function captureDurationLabel(minutes: CaptureDuration, live = false): string {
  if (minutes === null) return "Continuous live feed";
  return live ? `${minutes} min live session` : `${minutes} min clip`;
}
