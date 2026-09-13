import { supabase } from "@/integrations/supabase/client";

export type MyProfile = {
  id: string;
  display_name: string;
  full_name: string;
  avatar_url: string | null;
  terms_accepted_at: string | null;
  onboarded: boolean;
  onboarding_completed: boolean;
};

const TERMS_KEY = "onlooker.terms-accepted";

export function rememberTermsAcceptance() {
  try {
    localStorage.setItem(TERMS_KEY, new Date().toISOString());
  } catch {
    /* storage unavailable */
  }
}

export function readRememberedTerms(): string | null {
  try {
    return localStorage.getItem(TERMS_KEY);
  } catch {
    return null;
  }
}

export async function fetchMyProfile(): Promise<MyProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, display_name, full_name, avatar_url, terms_accepted_at, onboarded, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;

  if (data) return data as MyProfile;

  const seed = {
    id: user.id,
    display_name: (user.user_metadata?.["name"] as string | undefined) ?? "onlooker",
    full_name: (user.user_metadata?.["full_name"] as string | undefined) ?? "onlooker",
    avatar_url: (user.user_metadata?.["avatar_url"] as string | undefined) ?? null,
  };
  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert(seed)
    .select("id, display_name, full_name, avatar_url, terms_accepted_at, onboarded, onboarding_completed")
    .single();
  if (insertError) throw insertError;
  return created as MyProfile;
}

export async function completeMyProfile(input: {
  display_name: string;
  full_name: string;
  avatar_url?: string | null;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("You must be signed in.");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: input.display_name.trim(),
      full_name: input.full_name.trim(),
      avatar_url: input.avatar_url ?? null,
      onboarded: true,
      terms_accepted_at: readRememberedTerms() ?? new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) throw error;
}

export async function markOnboardingCompleted() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("You must be signed in.");

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);
  if (error) throw error;
}
