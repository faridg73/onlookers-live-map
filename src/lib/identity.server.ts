// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

type IdentitySession = {
  id: string;
  status?: string;
  metadata?: Record<string, string> | null;
  verified_outputs?: { address?: { country?: string | null } | null } | null;
  last_verification_report?: unknown;
};

/** Records a passed Stripe Identity check on the member's profile (idempotent). */
export async function markIdentityVerified(session: IdentitySession, country?: string | null) {
  const userId = session.metadata?.["userId"];
  if (!userId || session.status !== "verified") return false;
  const unfreeze = session.metadata?.["kind"] === "account_unfreeze";
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("payout_identity_verified_at, account_frozen_at")
    .eq("id", userId)
    .maybeSingle();
  const alreadyVerified = Boolean(profile?.payout_identity_verified_at);
  const needsUnfreeze = unfreeze && Boolean(profile?.account_frozen_at);
  if (alreadyVerified && !needsUnfreeze) return true;

  const resolvedCountry = (country ?? session.verified_outputs?.address?.country ?? session.metadata?.["country"] ?? null)
    ?.toUpperCase() ?? null;
  const { error } = await supabaseAdmin.rpc("record_payout_identity_verified" as never, {
    _uid: userId,
    _country: resolvedCountry,
    _unfreeze: unfreeze,
  } as never);
  if (error) {
    console.error("[identity] mark verified failed", { userId, message: error.message });
    return false;
  }
  if (needsUnfreeze) {
    await supabaseAdmin.from("payout_security_logs").insert({
      user_id: userId,
      event_type: "account_unfrozen",
      details: { session: session.id },
    });
  }
  if (alreadyVerified) return true;
  await supabaseAdmin.from("payout_security_logs").insert({
    user_id: userId,
    event_type: "identity_verified",
    details: { session: session.id, country: resolvedCountry },
  });
  return true;
}
