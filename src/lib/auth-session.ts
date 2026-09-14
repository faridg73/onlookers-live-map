import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

/** Matches only authentication/session data, leaving ordinary app preferences intact. */
export function isAuthStorageKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return (
    (normalized.startsWith("sb-") && normalized.includes("auth-token")) ||
    normalized.includes("supabase.auth.token") ||
    (normalized.startsWith("lovable") && normalized.includes("auth"))
  );
}

function removeAuthKeys(storage: Storage) {
  const keys = Array.from({ length: storage.length }, (_, index) => storage.key(index))
    .filter((key): key is string => Boolean(key))
    .filter(isAuthStorageKey);
  keys.forEach((key) => storage.removeItem(key));
  return keys;
}

/** Removes every browser-side auth trace of the previous account before authentication. */
export async function clearPreviousAuthState() {
  supabase.auth.stopAutoRefresh();
  const { error } = await supabase.auth.signOut({ scope: "local" });

  if (typeof window !== "undefined") {
    try {
      removeAuthKeys(window.localStorage);
      removeAuthKeys(window.sessionStorage);
    } catch {
      throw new Error("Your previous sign-in could not be cleared. Please allow browser storage and try again.");
    }
  }

  const { data: remaining } = await supabase.auth.getSession();
  if (error || remaining.session) {
    throw new Error("Your previous sign-in could not be cleared. Please reload and try again.");
  }
}

/** Validates the exact newly returned token and rejects any stale shared-client session. */
export async function requireExactAuthenticatedUser(session: Session): Promise<User> {
  const expectedUserId = session.user.id;
  const [{ data: verified, error }, { data: active }] = await Promise.all([
    supabase.auth.getUser(session.access_token),
    supabase.auth.getSession(),
  ]);
  const activeSession = active.session;
  if (
    error ||
    !verified.user ||
    verified.user.id !== expectedUserId ||
    activeSession?.user.id !== expectedUserId ||
    activeSession.access_token !== session.access_token
  ) {
    await clearPreviousAuthState();
    throw new Error("We could not confirm the new account. Please sign in again.");
  }
  return verified.user;
}