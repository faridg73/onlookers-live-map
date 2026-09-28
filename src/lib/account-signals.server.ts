// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { getRequest } from "@tanstack/react-start/server";

import { callerAddress } from "@/lib/rate-limit.server";

/**
 * Records the network address and device signature a member acted from, at the
 * moments that matter for money: posting a bounty, claiming one, and cashing
 * out. Settlement compares both sides of a bounty against this history so one
 * person using two accounts to pay themselves is flagged for review.
 *
 * Best effort only — a failure here must never stop the member's action.
 */
export async function recordAccountSignal(userId: string): Promise<void> {
  try {
    const headers = getRequest()?.headers;
    const agent = headers?.get("user-agent") ?? "";
    const platform = headers?.get("sec-ch-ua-platform") ?? "";
    const mobile = headers?.get("sec-ch-ua-mobile") ?? "";
    const language = headers?.get("accept-language") ?? "";
    const raw = `${agent}|${platform}|${mobile}|${language}`.trim();
    if (raw === "|||") return;

    const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const device = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, 32);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.rpc("record_account_signal" as never, {
      _uid: userId,
      _ip: callerAddress(),
      _device: device,
    } as never);
  } catch (error) {
    console.error("[signals] record failed", { userId, error: String(error) });
  }
}
