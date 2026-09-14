import { supabase } from "@/integrations/supabase/client";
import { sanitizeText } from "@/lib/sanitize";

export type MyProfile = {
  id: string;
  display_name: string;
  full_name: string;
  avatar_url: string | null;
  terms_accepted_at: string | null;
  onboarded: boolean;
  onboarding_completed: boolean;
  username: string | null;
  legal_first_name: string | null;
  legal_last_name: string | null;
};

const PROFILE_COLUMNS =
  "id, display_name, full_name, avatar_url, terms_accepted_at, onboarded, onboarding_completed, username, legal_first_name, legal_last_name";

/** Pre-generated recovery questions with fixed answer options. */
export const SECURITY_QUESTIONS = [
  {
    key: "first_pet",
    label: "What kind of pet did you have first?",
    options: ["Dog", "Cat", "Bird", "Fish", "Reptile", "Small mammal", "None"],
  },
  {
    key: "home_region",
    label: "Where did you grow up?",
    options: [
      "West Coast",
      "Midwest",
      "South",
      "Northeast",
      "Canada",
      "Latin America",
      "Europe",
      "Asia",
      "Africa",
      "Oceania",
    ],
  },
  {
    key: "favourite_scene",
    label: "Which place do you film most often?",
    options: [
      "Beach or waterfront",
      "City street",
      "Stadium or arena",
      "Concert venue",
      "Market",
      "Park or trail",
      "Airport or transit",
    ],
  },
] as const;

export type SecurityAnswers = Record<string, string>;

/** Live check used while someone types a username. */
export async function isUsernameAvailable(username: string): Promise<boolean> {
  const clean = username.trim();
  if (!clean) return false;
  const { data, error } = await supabase.rpc("is_username_available", { _username: clean });
  if (error) throw error;
  return Boolean(data);
}

export function usernameProblem(username: string): string | null {
  const clean = username.trim();
  if (clean.length < 3) return "At least 3 characters.";
  if (clean.length > 24) return "24 characters or fewer.";
  if (!/^[a-zA-Z0-9._]+$/.test(clean)) return "Letters, numbers, dots and underscores only.";
  return null;
}

/** Uploads a chosen image to private cloud storage and returns a long-lived link. */
export async function uploadAvatarFile(file: File): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("You must be signed in.");
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Images must be under 5 MB.");

  const ext = (file.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
  const path = `${user.id}/avatar-${Date.now()}.${ext || "jpg"}`;

  const { error } = await supabase.storage
    .from("avatars")
    .upload(path, file, { contentType: file.type, upsert: true });
  if (error) throw error;

  const { data: signed, error: signError } = await supabase.storage
    .from("avatars")
    .createSignedUrl(path, 60 * 60 * 24 * 365 * 5);
  if (signError || !signed?.signedUrl) throw signError ?? new Error("Could not link your photo.");
  return signed.signedUrl;
}

export async function saveSecurityAnswers(answers: SecurityAnswers, expectedUserId?: string) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("You must be signed in.");
  if (expectedUserId && user.id !== expectedUserId) throw new Error("Your session changed. Please sign in again.");

  const rows = Object.entries(answers)
    .filter(([, value]) => Boolean(value))
    .map(([question_key, answer_key]) => ({ user_id: user.id, question_key, answer_key }));
  if (rows.length === 0) return;

  const { error } = await supabase
    .from("profile_security_answers")
    .upsert(rows, { onConflict: "user_id,question_key" });
  if (error) throw error;
}

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

export async function fetchMyProfile(expectedUserId?: string): Promise<MyProfile | null> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) return null;
  if (expectedUserId && user.id !== expectedUserId) return null;

  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
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
    .select(PROFILE_COLUMNS)
    .single();
  if (insertError) throw insertError;
  return created as MyProfile;
}

export async function completeMyProfile(input: {
  expectedUserId: string;
  username: string;
  legal_first_name: string;
  legal_last_name: string;
  avatar_url?: string | null;
  security_answers?: SecurityAnswers;
}) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("You must be signed in.");
  if (user.id !== input.expectedUserId) throw new Error("Your session changed. Please sign in again.");

  const username = sanitizeText(input.username, { maxLength: 24 }).trim();
  const first = sanitizeText(input.legal_first_name, { maxLength: 60 }).trim();
  const last = sanitizeText(input.legal_last_name, { maxLength: 60 }).trim();

  const problem = usernameProblem(username);
  if (problem) throw new Error(problem);
  if (!(await isUsernameAvailable(username))) throw new Error("That username is already claimed.");

  const { error } = await supabase
    .from("profiles")
    .update({
      username,
      legal_first_name: first,
      legal_last_name: last,
      display_name: username,
      full_name: `${first} ${last}`.trim(),
      avatar_url: input.avatar_url ?? null,
      onboarded: true,
      terms_accepted_at: readRememberedTerms() ?? new Date().toISOString(),
    })
    .eq("id", user.id);
  if (error) {
    if (error.code === "23505" || /duplicate key/i.test(error.message)) {
      throw new Error("That username is already claimed.");
    }
    throw error;
  }

  if (input.security_answers) await saveSecurityAnswers(input.security_answers, input.expectedUserId);
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

/** Custom event dispatched to re-open the walkthrough on demand. */
export const REPLAY_ONBOARDING_EVENT = "onlooker:replay-onboarding";

/** Reset the onboarding flag and ask the mounted walkthrough to re-open. */
export async function replayOnboarding() {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (user) {
    const { error } = await supabase
      .from("profiles")
      .update({ onboarding_completed: false })
      .eq("id", user.id);
    if (error) throw error;
  }

  window.dispatchEvent(new CustomEvent(REPLAY_ONBOARDING_EVENT));
}
