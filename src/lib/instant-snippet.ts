import { supabase } from "@/integrations/supabase/client";
import { distanceMiles, requestMapPosition, type LiveRequest, type MapPosition } from "@/lib/onlooker";

/** How close a reporter must stand to unlock an instant snippet. */
export const SNIPPET_RANGE_FEET = 200;
/** Instant snippets are capped at ten seconds of footage. */
export const SNIPPET_SECONDS = 10;

const FEET_PER_MILE = 5280;

export function feetAway(user: MapPosition, request: LiveRequest) {
  return distanceMiles(user, requestMapPosition(request)) * FEET_PER_MILE;
}

/** True when this bounty is close enough to film on the spot. */
export function isSnippetInRange(user: MapPosition | null, request: LiveRequest) {
  if (!user || request.status !== "open") return false;
  return feetAway(user, request) <= SNIPPET_RANGE_FEET;
}

/**
 * Pays an instant snippet straight into the reporter's wallet, skipping the
 * usual review step because the footage was filmed at the pin.
 */
export async function payInstantSnippet(videoId: string): Promise<number> {
  const { data, error } = await supabase.rpc("submit_instant_snippet", { _video_id: videoId });
  if (error) throw new Error(error.message);
  return Number(data ?? 0);
}
