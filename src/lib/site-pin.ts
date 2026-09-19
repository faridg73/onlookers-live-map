// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";

/**
 * On-site PIN handshake for real estate bounties. The poster gets a unique
 * 6-digit PIN, the on-site agent reads it out, and the onlooker types it into
 * the app. Only a matching PIN marks the bounty verified on site and unlocks
 * footage submission and the payout that follows it.
 */
export type SitePinState = {
  /** True when this bounty is protected by an on-site PIN. */
  required: boolean;
  /** True when the signed-in person posted the bounty. */
  mine: boolean;
  /** The PIN itself, only ever returned to the poster. */
  pin: string | null;
  verified: boolean;
  verifiedAt: string | null;
  /** True when the signed-in person is the one who verified on site. */
  verifiedByMe: boolean;
};

const NONE: SitePinState = {
  required: false,
  mine: false,
  pin: null,
  verified: false,
  verifiedAt: null,
  verifiedByMe: false,
};

type RawState = {
  required?: boolean;
  mine?: boolean;
  pin?: string | null;
  verified?: boolean;
  verified_at?: string | null;
  verified_by_me?: boolean;
};

function shape(raw: unknown): SitePinState {
  const row = (raw ?? {}) as RawState;
  if (!row.required) return NONE;
  return {
    required: true,
    mine: Boolean(row.mine),
    pin: row.pin ?? null,
    verified: Boolean(row.verified),
    verifiedAt: row.verified_at ?? null,
    verifiedByMe: Boolean(row.verified_by_me),
  };
}

/** Reads whether this bounty needs a PIN and how far the handshake has got. */
export async function readSitePinState(requestId: string): Promise<SitePinState> {
  const { data, error } = await supabase.rpc("request_site_pin_state", {
    _request_id: requestId,
  });
  if (error) {
    console.error("[site-pin] state read failed", error);
    return NONE;
  }
  return shape(data);
}

export type SitePinResult =
  | { verified: true; verifiedAt: string | null }
  | { verified: false; attemptsLeft: number };

/** Checks the typed PIN on the server and records the on-site verification. */
export async function verifySitePin(requestId: string, pin: string): Promise<SitePinResult> {
  const { data, error } = await supabase.rpc("verify_request_site_pin", {
    _request_id: requestId,
    _pin: pin.trim(),
  });
  if (error) throw new Error(error.message);

  const row = (data ?? {}) as RawState & { attempts_left?: number };
  if (row.verified) return { verified: true, verifiedAt: row.verified_at ?? null };
  return { verified: false, attemptsLeft: Number(row.attempts_left ?? 0) };
}
