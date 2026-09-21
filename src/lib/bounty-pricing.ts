// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Transparent bounty pricing.
 *
 * Every requester sees exactly how their choices move the credit total before
 * anything is locked in escrow: the tier they pick sets the base, the stream or
 * recording length scales it, a tight deadline adds an urgency premium, and
 * rough conditions add a difficulty premium for the onlooker.
 */

export type BountyTierId = "standard" | "fast_catch" | "priority_hunt";

export type BountyTier = {
  id: BountyTierId;
  label: string;
  /** Fixed base credits, or null when the requester names their own amount. */
  baseCredits: number | null;
  blurb: string;
};

export const BOUNTY_TIERS: BountyTier[] = [
  {
    id: "standard",
    label: "Standard",
    baseCredits: null,
    blurb: "You set the reward",
  },
  {
    id: "fast_catch",
    label: "Fast Catch",
    baseCredits: 500,
    blurb: "Pushed to nearby onlookers first",
  },
  {
    id: "priority_hunt",
    label: "Priority Hunt",
    baseCredits: 1000,
    blurb: "Top of every feed until claimed",
  },
];

export function tierById(id: BountyTierId): BountyTier {
  return BOUNTY_TIERS.find((t) => t.id === id) ?? BOUNTY_TIERS[0]!;
}

export type WeatherCondition = {
  id: string;
  label: string;
  multiplier: number;
  blurb: string;
};

/** Conditions the onlooker has to shoot in, and what that difficulty is worth. */
export const WEATHER_CONDITIONS: WeatherCondition[] = [
  { id: "clear", label: "Clear", multiplier: 1, blurb: "Easy conditions" },
  { id: "night", label: "Night / low light", multiplier: 1.1, blurb: "Harder to film" },
  { id: "rain", label: "Rain or wind", multiplier: 1.15, blurb: "Gear at risk" },
  { id: "severe", label: "Storm / extreme heat", multiplier: 1.25, blurb: "Tough and slow" },
];

export function conditionByMultiplier(multiplier: number): WeatherCondition {
  return (
    WEATHER_CONDITIONS.find((c) => Math.abs(c.multiplier - multiplier) < 0.001) ??
    WEATHER_CONDITIONS[0]!
  );
}

/** Shortest capture we price, so the base always buys something usable. */
export const BASE_DURATION_MIN = 5;

/**
 * Open-ended live feeds have no set length, so they are priced as a fixed
 * session block instead of guessing a number of minutes.
 */
export const LIVE_FEED_DURATION_MINUTES = 15;

/** Every 5 minutes past the base adds 10% for the onlooker's time. */
export function durationMultiplier(minutes: number | null): number {
  const mins = minutes === null ? LIVE_FEED_DURATION_MINUTES : minutes;
  if (!Number.isFinite(mins) || mins <= BASE_DURATION_MIN) return 1;
  const extra = Math.max(0, Math.round(mins) - BASE_DURATION_MIN);
  return round2(1 + Math.ceil(extra / 5) * 0.1);
}

/** Tighter windows pay more, because someone has to drop everything. */
export function urgencyMultiplier(minutesUntilDue: number): number {
  if (!Number.isFinite(minutesUntilDue) || minutesUntilDue <= 0) return 1.3;
  if (minutesUntilDue <= 30) return 1.25;
  if (minutesUntilDue <= 60) return 1.15;
  if (minutesUntilDue <= 180) return 1.05;
  return 1;
}

/** Keeps every multiplier at two decimals so the shown percentage is the real one. */
function round2(value: number) {
  return Math.round(value * 100) / 100;
}

export type PriceLine = {
  label: string;
  detail: string;
  /** Multiplier applied at this step, or null for the base row. */
  multiplier: number | null;
  /** Running credit total after this step. */
  runningTotal: number;
};

export type BountyQuote = {
  baseCredits: number;
  durationFactor: number;
  urgencyFactor: number;
  weatherFactor: number;
  total: number;
  lines: PriceLine[];
};

/** Builds the full, itemised quote shown above the Lock Credits button. */
export function quoteBounty(input: {
  tier: BountyTierId;
  /** Requester-named amount, used only on the Standard tier. */
  customBase: number;
  /** Live stream or recording length in minutes; null = open-ended live feed. */
  durationMinutes: number | null;
  /** Minutes from now until the deadline / start window. */
  minutesUntilDue: number;
  weatherMultiplier: number;
  /**
   * When true, the gig algorithm already priced the minutes into the base
   * reward, so no duration multiplier is applied on top (no double charge).
   */
  durationPricedInBase?: boolean;
}): BountyQuote {
  const tier = tierById(input.tier);
  const rawBase = tier.baseCredits ?? input.customBase;
  const baseCredits = Math.max(
    0,
    Math.round(Number.isFinite(rawBase) ? rawBase : 0),
  );
  const durationFactor = input.durationPricedInBase
    ? 1
    : durationMultiplier(input.durationMinutes);
  const urgencyFactor = urgencyMultiplier(input.minutesUntilDue);
  const weatherFactor = Number.isFinite(input.weatherMultiplier)
    ? round2(input.weatherMultiplier)
    : 1;

  /* Multiply exactly once at full precision, then round only what is shown.
     Rounding each step would compound and inflate the final escrow. */
  const exactAfterDuration = baseCredits * durationFactor;
  const exactAfterUrgency = exactAfterDuration * urgencyFactor;
  const exactTotal = exactAfterUrgency * weatherFactor;
  const total = Math.round(exactTotal);

  const pct = (m: number) => `${m >= 1 ? "+" : ""}${Math.round((m - 1) * 100)}%`;
  const lengthLabel =
    input.durationMinutes === null
      ? "Open-ended live feed"
      : `${Math.round(input.durationMinutes)} min capture`;

  const lines: PriceLine[] = [
    {
      label: `${tier.label} base`,
      detail: tier.baseCredits ? "Fixed tier reward" : "Your chosen reward",
      multiplier: null,
      runningTotal: baseCredits,
    },
    {
      label: lengthLabel,
      detail:
        input.durationPricedInBase
          ? "Priced into the gig rate"
          : durationFactor === 1
            ? "Base length, no extra"
            : `${pct(durationFactor)} for the extra minutes`,
      multiplier: durationFactor,
      runningTotal: Math.round(exactAfterDuration),
    },
    {
      label: "Schedule urgency",
      detail:
        urgencyFactor === 1
          ? "Relaxed window, no extra"
          : `${pct(urgencyFactor)} for a tight window`,
      multiplier: urgencyFactor,
      runningTotal: Math.round(exactAfterUrgency),
    },
    {
      label: "Conditions",
      detail:
        weatherFactor === 1
          ? "Clear conditions, no extra"
          : `${pct(weatherFactor)}, ${conditionByMultiplier(weatherFactor).label.toLowerCase()}`,
      multiplier: weatherFactor,
      runningTotal: total,
    },
  ];

  return { baseCredits, durationFactor, urgencyFactor, weatherFactor, total, lines };
}
