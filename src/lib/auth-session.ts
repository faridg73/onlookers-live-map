import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Removes every browser-side trace of the previous account before authentication. */
export async function clearPreviousAuthState() {
  await supabase.auth.signOut().catch(() => undefined);
  try {
    window.localStorage.clear();
    window.sessionStorage.clear();
  } catch {
    // Storage can be unavailable in privacy-restricted browsers.
  }
}

/** Revalidates the active token and rejects any session other than the expected account. */
export async function requireExactAuthenticatedUser(expectedUserId: string): Promise<User> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user || data.user.id !== expectedUserId) {
    await clearPreviousAuthState();
    throw new Error("We could not confirm the new account. Please sign in again.");
  }
  return data.user;
}