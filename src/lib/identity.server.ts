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
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("payout_identity_verified_at")
    .eq("id", userId)
    .maybeSingle();
  if (profile?.payout_identity_verified_at) return true;

  const resolvedCountry = (country ?? session.verified_outputs?.address?.country ?? session.metadata?.["country"] ?? null)
    ?.toUpperCase() ?? null;
  const { error } = await supabaseAdmin
    .from("profiles")
    .update({ payout_identity_verified_at: new Date().toISOString(), payout_country: resolvedCountry })
    .eq("id", userId);
  if (error) {
    console.error("[identity] mark verified failed", { userId, message: error.message });
    return false;
  }
  await supabaseAdmin.from("payout_security_logs").insert({
    user_id: userId,
    event_type: "identity_verified",
    details: { session: session.id, country: resolvedCountry },
  });
  return true;
}
