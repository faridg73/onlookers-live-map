// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { addEvidence } from "@/lib/disputes";
import { openDisputeWithEvidence } from "@/lib/dispute-filing.functions";


/** Minimum written detail a poster must give before a report can be filed. */
export const REPORT_DETAIL_MIN = 40;

export const REPORT_REASONS = [
  {
    code: "verification_mismatch",
    label: "Wrong location or not on site",
    hint: "The capture is not from the place the bounty asked for.",
  },
  {
    code: "failure_to_deliver",
    label: "Did not follow the bounty instructions",
    hint: "A specific angle, subject or detail you asked for is missing.",
  },
  {
    code: "quality_issue",
    label: "Unusable video or audio quality",
    hint: "Too dark, too shaky, or impossible to make out.",
  },
  {
    code: "other_policy_violation",
    label: "Safety or policy concern",
    hint: "Privacy, trespass, harassment or another safety problem.",
  },
] as const;

export type ReportReasonCode = (typeof REPORT_REASONS)[number]["code"];

function rawRequestId(requestId: string) {
  return requestId.startsWith("db-") ? requestId.slice(3) : requestId;
}

/**
 * File a report against a submitted capture. The money stays held until a
 * moderator decides. Safety concerns go through the moderation path, everything
 * else through the escrow dispute path that stores the written evidence.
 */
export async function reportCapture(
  requestId: string,
  reasonCode: ReportReasonCode,
  details: string,
): Promise<void> {
  const id = rawRequestId(requestId);
  const body = details.trim();
  if (body.length < REPORT_DETAIL_MIN) {
    throw new Error(`Add at least ${REPORT_DETAIL_MIN} characters explaining the problem.`);
  }

  if (reasonCode === "other_policy_violation") {
    const { error } = await supabase.rpc("dispute_bounty", {
      _request_id: id,
      _reason: body,
      _reason_code: "other_policy_violation",
    });
    if (error) throw error;
    await addEvidence(id, body, "poster").catch(() => undefined);
    return;
  }

  await openDisputeWithEvidence({
    data: { requestId: id, reasonCode, description: body, file: null },
  });
}

