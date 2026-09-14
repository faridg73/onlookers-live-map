import { supabase } from "@/integrations/supabase/client";

export type VerificationStatus = {
  isVerified: boolean;
  requestedAt: string | null;
};

/** Verification state for the signed-in creator, or null when nobody is signed in. */
export async function fetchMyVerification(): Promise<VerificationStatus | null> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("is_verified, verification_requested_at")
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error || !data) return null;
  return {
    isVerified: Boolean(data.is_verified),
    requestedAt: data.verification_requested_at ?? null,
  };
}

/** Applies for creator verification; staff review the request afterwards. */
export async function requestCreatorVerification(): Promise<string> {
  const { data, error } = await supabase.rpc("request_creator_verification");
  if (error) throw new Error(error.message);
  return (data as string | null) ?? new Date().toISOString();
}

const verifiedCache = new Map<string, boolean>();

/** Which of these accounts carry the verified mark (cached per session). */
export async function fetchVerifiedFlags(userIds: string[]): Promise<Set<string>> {
  const ids = [...new Set(userIds.filter(Boolean))];
  const result = new Set<string>();
  const missing: string[] = [];
  for (const id of ids) {
    const hit = verifiedCache.get(id);
    if (hit === undefined) missing.push(id);
    else if (hit) result.add(id);
  }
  if (missing.length > 0) {
    const { data } = await supabase.from("profiles").select("id, is_verified").in("id", missing);
    for (const id of missing) verifiedCache.set(id, false);
    for (const row of data ?? []) {
      verifiedCache.set(row.id, Boolean(row.is_verified));
      if (row.is_verified) result.add(row.id);
    }
  }
  return result;
}

/** Verified state for one account, safe to call from cards. */
export async function isCreatorVerified(userId: string): Promise<boolean> {
  if (!userId) return false;
  const flags = await fetchVerifiedFlags([userId]);
  return flags.has(userId);
}
