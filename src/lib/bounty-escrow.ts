import {
  cancelBountyRequest,
  createBountyRequest,
  getWalletBalance,
  settleExpiredBounties,
} from "@/lib/requests.functions";

export const MIN_BOUNTY = 5;

function message(error: unknown, fallback: string) {
  return error instanceof Error && error.message ? error.message : fallback;
}

export async function readWalletBalance(): Promise<number | null> {
  try {
    return await getWalletBalance();
  } catch {
    return null;
  }
}

export type LockedBounty = { id: string; balance: number };

/** Posts the request and locks its exact bounty out of the wallet. */
export async function lockBounty(input: {
  prompt: string;
  locationName: string;
  bounty: number;
  category?: string | null;
}): Promise<LockedBounty> {
  try {
    return await createBountyRequest({ data: { ...input, minutes: 60 } });
  } catch (error) {
    throw new Error(message(error, "Could not lock the bounty deposit."));
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
    await settleExpiredBounties();
  } catch {
    // Signed-out visitors simply skip the sweep.
  }
}
