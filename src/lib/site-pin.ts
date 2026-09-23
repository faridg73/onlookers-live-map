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
  /** When the PIN stops working. A PIN is single use and always expires. */
  expiresAt: string | null;
  expired: boolean;
  /** True once the property contact said the visit was never authorized. */
  declined: boolean;
  declinedAt: string | null;
  declineNote: string | null;
  /** How many times the PIN has been delivered, and when it last went out. */
  sendCount: number;
  lastSentAt: string | null;
  agentPhoneSet: boolean;
  agentEmailSet: boolean;
  /** True when this person may trigger a resend to the agent. */
  canResend: boolean;
  /** True when the signed-in person is the onlooker working this bounty. */
  isSpotter: boolean;
  /** True when the onlooker has waited long enough to report no PIN arrived. */
  unreachableEligible: boolean;
};

const NONE: SitePinState = {
  required: false,
  mine: false,
  pin: null,
  verified: false,
  verifiedAt: null,
  verifiedByMe: false,
  expiresAt: null,
  expired: false,
  declined: false,
  declinedAt: null,
  declineNote: null,
  sendCount: 0,
  lastSentAt: null,
  agentPhoneSet: false,
  agentEmailSet: false,
  canResend: false,
  isSpotter: false,
  unreachableEligible: false,
};

type RawState = {
  required?: boolean;
  mine?: boolean;
  pin?: string | null;
  verified?: boolean;
  verified_at?: string | null;
  verified_by_me?: boolean;
  expires_at?: string | null;
  expired?: boolean;
  declined?: boolean;
  declined_at?: string | null;
  decline_note?: string | null;
  send_count?: number;
  last_sent_at?: string | null;
  agent_phone_set?: boolean;
  agent_email_set?: boolean;
  can_resend?: boolean;
  is_spotter?: boolean;
  unreachable_eligible?: boolean;
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
    expiresAt: row.expires_at ?? null,
    expired: Boolean(row.expired),
    declined: Boolean(row.declined),
    declinedAt: row.declined_at ?? null,
    declineNote: row.decline_note ?? null,
    sendCount: Number(row.send_count ?? 0),
    lastSentAt: row.last_sent_at ?? null,
    agentPhoneSet: Boolean(row.agent_phone_set),
    agentEmailSet: Boolean(row.agent_email_set),
    canResend: Boolean(row.can_resend),
    isSpotter: Boolean(row.is_spotter),
    unreachableEligible: Boolean(row.unreachable_eligible),
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

/**
 * The onlooker is on site but the agent never relayed the PIN. Holds the money
 * and sends the trip to review for a partial kill fee, instead of leaving the
 * onlooker with nothing for the journey.
 */
export async function reportAgentUnreachable(requestId: string, description: string) {
  const { error } = await supabase.rpc("report_agent_unreachable", {
    _request_id: requestId,
    _description: description.trim(),
  });
  if (error) throw new Error(error.message);
}
