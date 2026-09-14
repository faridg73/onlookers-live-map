import {
  cancelBountyRequest,
  createBountyRequest,
  getBountyAccessCode,
  getWalletBalance,
  listActiveRequests,
  settleExpiredBounties,
  type ActiveRequestRow,
} from "@/lib/requests.functions";

export const MIN_BOUNTY = 20;

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Signed-out visitors must never hit the authenticated server functions. */
export async function isSignedIn() {
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    return !!data.session;
  } catch {
    return false;
  }
}

export async function readWalletBalance(): Promise<number | null> {
  try {
    if (!(await isSignedIn())) return null;
    return await getWalletBalance();
  } catch {
    return null;
  }
}

export type LockedBounty = { id: string; balance: number };

/** Posts the request and locks its exact bounty out of the wallet. */
export async function lockBounty(input: {
  prompt: string;
  /** Camera instructions, checked by the content filter before publishing. */
  details?: string | null;
  locationName: string;
  bounty: number;
  category?: string | null;
  accessCode?: string | null;
  latitude?: number | undefined;
  longitude?: number | undefined;
  /** Minutes until the request expires and the deposit is swept back. */
  minutes?: number;
  /** Exact calendar deadline; overrides `minutes` on the server when set. */
  customDeadlineAt?: string | null;
  /** Live stream / recording length in minutes. */
  durationMinutes?: number | null;
  /** 'live_stream' or 'pre_recorded_clip'. */
  bountyType?: "live_stream" | "pre_recorded_clip" | null;
  /** When a pre-recorded clip's recording should start. */
  scheduledStartAt?: string | null;
  /** Requester-typed capture length, when no preset pill was used. */
  customDurationMinutes?: number | null;
  /** Difficulty premium for filming conditions, 1.0 = clear. */
  weatherMultiplier?: number | null;
  /** Reward tier the requester picked. */
  bountyTier?: "standard" | "fast_catch" | "priority_hunt" | null;
  /** Human-check token from the posting form. */
  captchaToken?: string | null;
}): Promise<LockedBounty> {
  try {
    const { minutes = 60, ...rest } = input;
    return await createBountyRequest({ data: { ...rest, minutes } });
  } catch (error) {
    throw new Error(message(error, "Could not lock the bounty deposit."));
  }
}

/** Reads the private access passcode for a claimed or owned request. */
export async function readAccessCode(dbId: string): Promise<string | null> {
  try {
    if (!(await isSignedIn())) return null;
    return await getBountyAccessCode({ data: { id: dbId } });
  } catch {
    return null;
  }
}

/** Cancels a request and refunds the whole deposit. */
export async function refundBounty(dbId: string): Promise<number> {
  try {
    const { balance } = await cancelBountyRequest({ data: { id: dbId } });
    return balance;
  } catch (error) {
    throw new Error(message(error, "Could not cancel that request."));
  }
}

/** Sweeps expired requests so their deposits go back to the requester. */
export async function refundExpiredBounties() {
  try {
    if (!(await isSignedIn())) return; // Signed-out visitors skip the sweep.
    await settleExpiredBounties();
  } catch {
    // Never let the background sweep break the map.
  }
}

/** Every live request on the platform, so the map and feed are shared. */
export async function readActiveRequests(): Promise<ActiveRequestRow[]> {
  try {
    if (!(await isSignedIn())) return [];
    return await listActiveRequests();
  } catch {
    return [];
  }
}
