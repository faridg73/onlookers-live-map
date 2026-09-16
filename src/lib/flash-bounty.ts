import { quoteBounty, type BountyTierId } from "@/lib/bounty-pricing";
import { lockBounty, type LockedBounty } from "@/lib/bounty-escrow";
import { requestCurrentPosition } from "@/lib/geolocation";
import { reverseGeocode } from "@/lib/geocode.functions";

/** Minimum credits a flash bounty can lock. Higher than the general minimum
 *  because a spontaneous, time-sensitive alert needs enough reward to motivate
 *  an onlooker to drop everything and start filming. */
export const FLASH_MIN_BOUNTY_CREDITS = 40;


/**
 * One-tap "Happening Here Now" bounty.
 *
 * Everything is fixed so a spontaneous event can be broadcast in a single tap:
 * a 5-minute live stream, a 15-minute window, and the poster's own GPS pin.
 * The requester now picks the reward tier (or types their own amount) and the
 * tight window means the urgency premium applies transparently.
 */
export const FLASH_DURATION_MINUTES = 5;
export const FLASH_WINDOW_MINUTES = 15;

export const FLASH_TITLE = "Happening here now, go live";

export type FlashTierPreset = {
  id: BountyTierId;
  label: string;
  /** Fixed base credits, or null when the requester names their own amount. */
  baseCredits: number | null;
  blurb: string;
};

export const FLASH_TIERS: FlashTierPreset[] = [
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
    label: "High Priority",
    baseCredits: 1000,
    blurb: "Top of every feed until claimed",
  },
];

export const DEFAULT_FLASH_TIER: BountyTierId = "fast_catch";
export const DEFAULT_CUSTOM_BASE = 100;

/** Optional extras the requester can tick, each adding its own credits. */
export type FlashConditionId = "rain_storm" | "night_view" | "landmark";

export type FlashCondition = {
  id: FlashConditionId;
  label: string;
  credits: number;
  blurb: string;
};

export const FLASH_CONDITIONS: FlashCondition[] = [
  {
    id: "rain_storm",
    label: "Rain/Storm check",
    credits: 20,
    blurb: "Filming in wet or severe weather",
  },
  {
    id: "night_view",
    label: "Night/Low light view",
    credits: 10,
    blurb: "After-dark visibility",
  },
  {
    id: "landmark",
    label: "Specific landmark",
    credits: 30,
    blurb: "Must frame an exact landmark or event",
  },
];

export type FlashBountyOptions = {
  tierId: BountyTierId;
  customBase: number;
  /** Ticked add-on conditions, each adding its credits to the escrow total. */
  conditionIds?: FlashConditionId[];
};

export function flashConditionsFor(ids: FlashConditionId[] | undefined): FlashCondition[] {
  if (!ids?.length) return [];
  return FLASH_CONDITIONS.filter((c) => ids.includes(c.id));
}

/** Extra credits added by the ticked conditions. */
export function flashConditionsCredits(ids: FlashConditionId[] | undefined): number {
  return flashConditionsFor(ids).reduce((sum, c) => sum + c.credits, 0);
}

/** Builds the itemised quote for a flash bounty with the fixed duration/window. */
export function quoteFlashBounty(options: FlashBountyOptions) {
  const base = quoteBounty({
    tier: options.tierId,
    customBase: options.customBase,
    durationMinutes: FLASH_DURATION_MINUTES,
    minutesUntilDue: FLASH_WINDOW_MINUTES,
    weatherMultiplier: 1,
  });
  const picked = flashConditionsFor(options.conditionIds);
  if (!picked.length) return base;
  let running = base.total;
  const lines = [...base.lines];
  for (const condition of picked) {
    running += condition.credits;
    lines.push({
      label: `${condition.label} (+${condition.credits})`,
      detail: condition.blurb,
      multiplier: null,
      runningTotal: running,
    });
  }
  return { ...base, lines, total: running };
}

/** Total credits that will be locked in escrow for the selected flash options. */
export function computeFlashCredits(options: FlashBountyOptions): number {
  return quoteFlashBounty(options).total;
}

/** The fixed legacy default (Fast Catch) for callers that don't pass options. */
export const FLASH_QUOTE = quoteFlashBounty({
  tierId: DEFAULT_FLASH_TIER,
  customBase: DEFAULT_CUSTOM_BASE,
});
export const FLASH_CREDITS = FLASH_QUOTE.total;

export type FlashSpot = { latitude: number; longitude: number; formatted: string };

/** Grabs the poster's exact position and names it, so the pin is ready to post. */
export async function readFlashSpot(): Promise<FlashSpot> {
  const position = await requestCurrentPosition();
  const { latitude, longitude } = position.coords;
  const found = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
  return {
    latitude,
    longitude,
    formatted: found?.formatted ?? "My current location",
  };
}

/** Locks the flash bounty at the given pin with the requester's chosen tier/amount. */
export function postFlashBounty(
  spot: FlashSpot,
  options: Partial<FlashBountyOptions> = {},
): Promise<LockedBounty> {
  const resolved: FlashBountyOptions = {
    tierId: options.tierId ?? DEFAULT_FLASH_TIER,
    customBase: Math.max(
      FLASH_MIN_BOUNTY_CREDITS,
      Math.round(options.customBase ?? DEFAULT_CUSTOM_BASE),
    ),
  };
  const quote = quoteFlashBounty(resolved);


  const details = [
    "Format: Go Live Now (flash bounty)",
    `Requested capture: ${FLASH_DURATION_MINUTES} min live session`,
    "Camera: Wide establishing · Vertical",
    "Something is happening right here right now, start a live stream from this exact spot and show what you can see.",
  ].join("\n");

  return lockBounty({
    prompt: FLASH_TITLE,
    details,
    locationName: spot.formatted,
    bounty: quote.total,
    category: "events",
    latitude: spot.latitude,
    longitude: spot.longitude,
    minutes: FLASH_WINDOW_MINUTES,
    durationMinutes: FLASH_DURATION_MINUTES,
    bountyType: "live_stream",
    weatherMultiplier: 1,
    bountyTier: resolved.tierId,
  });
}
