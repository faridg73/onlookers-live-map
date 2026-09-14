import { quoteBounty } from "@/lib/bounty-pricing";
import { lockBounty, type LockedBounty } from "@/lib/bounty-escrow";
import { requestCurrentPosition } from "@/lib/geolocation";
import { reverseGeocode } from "@/lib/geocode.functions";

/**
 * One-tap "Happening Here Now" bounty.
 *
 * Everything is fixed so a spontaneous event can be broadcast in a single tap:
 * the Fast Catch tier, a 5-minute live stream, a 15-minute window, and the
 * poster's own GPS pin. The tight window means the urgency premium applies, so
 * the quote below is exactly what gets locked in escrow.
 */
export const FLASH_TIER = "fast_catch" as const;
export const FLASH_DURATION_MINUTES = 5;
export const FLASH_WINDOW_MINUTES = 15;

export const FLASH_QUOTE = quoteBounty({
  tier: FLASH_TIER,
  customBase: 0,
  durationMinutes: FLASH_DURATION_MINUTES,
  minutesUntilDue: FLASH_WINDOW_MINUTES,
  weatherMultiplier: 1,
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

export const FLASH_TITLE = "Happening here now — go live";

/** Locks the fixed flash bounty at the given pin. */
export function postFlashBounty(spot: FlashSpot): Promise<LockedBounty> {
  const details = [
    "Format: Go Live Now (flash bounty)",
    `Requested capture: ${FLASH_DURATION_MINUTES} min live session`,
    "Camera: Wide establishing · Vertical",
    "Something is happening right here right now — start a live stream from this exact spot and show what you can see.",
  ].join("\n");

  return lockBounty({
    prompt: FLASH_TITLE,
    details,
    locationName: spot.formatted,
    bounty: FLASH_CREDITS,
    category: "events",
    latitude: spot.latitude,
    longitude: spot.longitude,
    minutes: FLASH_WINDOW_MINUTES,
    durationMinutes: FLASH_DURATION_MINUTES,
    bountyType: "live_stream",
    weatherMultiplier: 1,
    bountyTier: FLASH_TIER,
  });
}
