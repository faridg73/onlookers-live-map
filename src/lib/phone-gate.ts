import { supabase } from "@/integrations/supabase/client";

export type PhoneGateStatus = {
  signedIn: boolean;
  verified: boolean;
  email: string | null;
  phone: string | null;
};

/**
 * Reads whether the signed-in member has a confirmed mobile number.
 *
 * Social sign-ins (Google/Apple) never go through the text-message step, so
 * their profile starts without a confirmed number. If a number was confirmed
 * earlier under the same email we claim it here before reporting back.
 */
export async function fetchPhoneGateStatus(): Promise<PhoneGateStatus> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return { signedIn: false, verified: false, email: null, phone: null };

  const email = user.email ?? null;
  const { data } = await supabase
    .from("profiles")
    .select("phone, phone_verified_at")
    .eq("id", user.id)
    .maybeSingle();

  if (data?.phone_verified_at) {
    return { signedIn: true, verified: true, email, phone: data.phone ?? null };
  }

  // Maybe the number was confirmed before the profile row caught up.
  const claimed = await supabase.rpc("claim_verified_phone");
  const row = Array.isArray(claimed.data) ? claimed.data[0] : null;
  if (row?.verified_at) {
    return { signedIn: true, verified: true, email, phone: row.phone ?? null };
  }
  return { signedIn: true, verified: false, email, phone: null };
}

/** Copies a freshly confirmed number onto the signed-in member's profile. */
export async function claimVerifiedPhone() {
  const { error } = await supabase.rpc("claim_verified_phone");
  if (error) throw error;
}
