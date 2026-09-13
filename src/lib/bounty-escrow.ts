import {
  cancelBountyRequest,
  createBountyRequest,
  getBountyAccessCode,
  getWalletBalance,
  settleExpiredBounties,
} from "@/lib/requests.functions";

export const MIN_BOUNTY = 20;

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

/** Signed-out visitors must never hit the authenticated server functions. */
async function isSignedIn() {
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
