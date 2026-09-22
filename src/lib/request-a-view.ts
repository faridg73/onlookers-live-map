// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { quoteBounty, type BountyTierId } from "@/lib/bounty-pricing";
import { lockBounty, type LockedBounty } from "@/lib/bounty-escrow";
import { reverseGeocode } from "@/lib/geocode.functions";

/**
 * "Request a View" — anyone, anywhere, drops a pin on the world map and funds a
 * live stream from that exact spot. The reward is locked in escrow the moment
 * the pin is confirmed, and everyone standing near it gets a bounty alert.
 */

/** Smallest reward a global pin can carry, so it is worth someone's walk. */
export const REQUEST_VIEW_MIN_CREDITS = 40;

/** Live stream length we ask for by default. */
export const REQUEST_VIEW_DURATION_MINUTES = 5;

/** How long broadcasters have to pick the pin up. */
export const REQUEST_VIEW_WINDOWS = [30, 60, 180] as const;
export const DEFAULT_REQUEST_VIEW_WINDOW = 60;

export const REQUEST_VIEW_TITLE = "Request a view, go live from this pin";

export type ViewTierPreset = {
  id: BountyTierId;
  label: string;
  /** Fixed base credits, or null when the requester names their own amount. */
  baseCredits: number | null;
  blurb: string;
};

export const REQUEST_VIEW_TIERS: ViewTierPreset[] = [
  { id: "standard", label: "Standard", baseCredits: null, blurb: "You set the reward" },
  { id: "fast_catch", label: "Fast Catch", baseCredits: 500, blurb: "Pushed to nearby onlookers first" },
  { id: "priority_hunt", label: "High Priority", baseCredits: 1000, blurb: "Top of every feed until claimed" },
];

export const DEFAULT_REQUEST_VIEW_TIER: BountyTierId = "standard";
export const DEFAULT_REQUEST_VIEW_BASE = 100;

export type ViewPin = { latitude: number; longitude: number; formatted: string };

export type RequestViewOptions = {
  tierId: BountyTierId;
  customBase: number;
  windowMinutes: number;
  /** Requester-typed name for the spot, when the lookup was vague. */
  placeName: string;
};

/** Names a dropped pin from its coordinates, anywhere in the world. */
export async function namePin(latitude: number, longitude: number): Promise<ViewPin> {
  const found = await reverseGeocode({ data: { latitude, longitude } }).catch(() => null);
  return {
    latitude,
    longitude,
    formatted:
      found?.formatted?.trim() ||
      `Pin at ${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
  };
}

/** Itemised quote for the pin's chosen tier, amount and window. */
export function quoteRequestedView(options: Pick<RequestViewOptions, "tierId" | "customBase" | "windowMinutes">) {
  return quoteBounty({
    tier: options.tierId,
    customBase: options.customBase,
    durationMinutes: REQUEST_VIEW_DURATION_MINUTES,
    minutesUntilDue: options.windowMinutes,
    weatherMultiplier: 1,
  });
}

export function computeRequestedViewCredits(
  options: Pick<RequestViewOptions, "tierId" | "customBase" | "windowMinutes">,
): number {
  return quoteRequestedView(options).total;
}

export type ViewFormErrors = { placeName?: string; customBase?: string };

/** Field-level checks, so nothing ever fails silently on the pin sheet. */
export function requestViewErrors(options: RequestViewOptions): ViewFormErrors {
  const errors: ViewFormErrors = {};
  if (options.placeName.trim().length < 3) {
    errors.placeName = "Name this spot so broadcasters know where to go (3 characters or more).";
  }
  if (options.tierId === "standard") {
    const amount = options.customBase;
    if (!Number.isFinite(amount) || !Number.isInteger(amount) || amount < REQUEST_VIEW_MIN_CREDITS) {
      errors.customBase = `Enter a whole number of credits (minimum ${REQUEST_VIEW_MIN_CREDITS}).`;
    }
  }
  return errors;
}

/** Locks the reward in escrow and publishes the pin to the shared world map. */
export function postRequestedView(
  pin: ViewPin,
  options: RequestViewOptions,
  captchaToken: string | null,
): Promise<LockedBounty> {
  const errors = requestViewErrors(options);
  const first = errors.placeName ?? errors.customBase;
  if (first) throw new Error(first);

  const quote = quoteRequestedView(options);
  const details = [
    "Format: Request a View (global pin)",
    `Requested capture: ${REQUEST_VIEW_DURATION_MINUTES} min live session`,
    "Camera: Wide establishing · Vertical",
    "Someone funded a live view of this exact spot, start a live stream from the pin and show what you can see.",
  ].join("\n");

  return lockBounty({
    prompt: REQUEST_VIEW_TITLE,
    details,
    locationName: options.placeName.trim(),
    // Request-a-View pins are always public vantage points.
    locationType: "public",
    bounty: quote.total,
    category: "events",
    latitude: pin.latitude,
    longitude: pin.longitude,
    minutes: options.windowMinutes,
    durationMinutes: REQUEST_VIEW_DURATION_MINUTES,
    bountyType: "live_stream",
    weatherMultiplier: 1,
    bountyTier: options.tierId,
    captchaToken,
  });
}
