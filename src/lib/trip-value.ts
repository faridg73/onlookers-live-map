// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { creditsToUsdValue, PLATFORM_FEE_RATE } from "@/lib/credits";

/**
 * Average door-to-door speed for a short local trip: slower than a highway
 * drive because of parking, lights and the last walk to the spot.
 */
export const TRAVEL_MPH = 20;

/** Time on the spot assumed when a bounty does not state a capture length. */
export const DEFAULT_ON_SITE_MINUTES = 10;

/** Rough travel time for a local trip, never less than 2 minutes. */
export function travelMinutes(miles: number) {
  if (!Number.isFinite(miles) || miles <= 0) return 2;
  return Math.max(2, Math.round((miles / TRAVEL_MPH) * 60));
}

export type TripValue = {
  travelMinutes: number;
  onSiteMinutes: number;
  /** Travel there, time on the spot, and the trip back. */
  totalMinutes: number;
  /** What the onlooker actually keeps, after the platform fee. */
  payoutUsd: number;
  /** Payout spread across the whole round trip. */
  hourlyUsd: number;
};

/**
 * Ride-share style trip value: what this bounty pays once the drive there and
 * back plus the time filming are counted, so bounties can be compared at a glance.
 */
export function tripValue({
  miles,
  credits,
  onSiteMinutes,
}: {
  miles: number;
  credits: number;
  onSiteMinutes?: number | null | undefined;
}): TripValue {
  const onSite = Math.max(2, Math.round(onSiteMinutes ?? DEFAULT_ON_SITE_MINUTES));
  const travel = travelMinutes(miles);
  const totalMinutes = travel * 2 + onSite;
  const payoutUsd = creditsToUsdValue(credits - Math.floor(credits * PLATFORM_FEE_RATE));
  const hourlyUsd = Math.round((payoutUsd / (totalMinutes / 60)) * 100) / 100;
  return { travelMinutes: travel, onSiteMinutes: onSite, totalMinutes, payoutUsd, hourlyUsd };
}

/** "$11.50" */
export function formatUsd(usd: number) {
  return `$${usd.toFixed(2)}`;
}

/** "$38/hr" — whole dollars, since this is only an estimate. */
export function formatHourly(usd: number) {
  return `$${Math.round(usd)}/hr`;
}

/** "9 min" or "1 hr 5 min" */
export function formatMinutes(minutes: number) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} hr ${rest} min` : `${hours} hr`;
}
