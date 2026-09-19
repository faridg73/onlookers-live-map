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

/** Every 5 minutes past the base adds 10% for the onlooker's time. */
export function durationMultiplier(minutes: number): number {
  const extra = Math.max(0, minutes - BASE_DURATION_MIN);
  return 1 + Math.ceil(extra / 5) * 0.1;
}

/** Tighter windows pay more, because someone has to drop everything. */
export function urgencyMultiplier(minutesUntilDue: number): number {
  if (!Number.isFinite(minutesUntilDue) || minutesUntilDue <= 0) return 1.3;
  if (minutesUntilDue <= 30) return 1.25;
  if (minutesUntilDue <= 60) return 1.15;
  if (minutesUntilDue <= 180) return 1.05;
  return 1;
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
  /** Live stream or recording length in minutes. */
  durationMinutes: number;
  /** Minutes from now until the deadline / start window. */
  minutesUntilDue: number;
  weatherMultiplier: number;
}): BountyQuote {
  const tier = tierById(input.tier);
  const baseCredits = Math.round(tier.baseCredits ?? Math.max(0, input.customBase));
  const durationFactor = durationMultiplier(input.durationMinutes);
  const urgencyFactor = urgencyMultiplier(input.minutesUntilDue);
  const weatherFactor = input.weatherMultiplier;

  const afterDuration = Math.round(baseCredits * durationFactor);
  const afterUrgency = Math.round(afterDuration * urgencyFactor);
  const total = Math.round(afterUrgency * weatherFactor);

  const pct = (m: number) => `${m >= 1 ? "+" : ""}${Math.round((m - 1) * 100)}%`;

  const lines: PriceLine[] = [
    {
      label: `${tier.label} base`,
      detail: tier.baseCredits ? "Fixed tier reward" : "Your chosen reward",
      multiplier: null,
      runningTotal: baseCredits,
    },
    {
      label: `${input.durationMinutes} min capture`,
      detail:
        durationFactor === 1
          ? "Base length, no extra"
          : `${pct(durationFactor)} for the extra minutes`,
      multiplier: durationFactor,
      runningTotal: afterDuration,
    },
    {
      label: "Schedule urgency",
      detail:
        urgencyFactor === 1
          ? "Relaxed window, no extra"
          : `${pct(urgencyFactor)} for a tight window`,
      multiplier: urgencyFactor,
      runningTotal: afterUrgency,
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
