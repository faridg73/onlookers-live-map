// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * A browser Supabase client used *only* to send password-reset emails.
 *
 * The normal app client uses the PKCE flow, which stores a one-time secret in
 * the browser that asked for the reset. When someone asks for a reset on their
 * laptop and then opens the email on their phone, that secret isn't there, so
 * the link looks expired. This client asks for the reset with the implicit
 * flow instead: the link itself carries everything needed, so it can be opened
 * on any phone, tablet or browser.
 */
import { createClient } from "@supabase/supabase-js";

function isOpaqueKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function keyedFetch(key: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, name) => headers.set(name, value));
    }
    if (isOpaqueKey(key) && headers.get("Authorization") === `Bearer ${key}`) {
      headers.delete("Authorization");
    }
    headers.set("apikey", key);
    return fetch(input, { ...init, headers });
  };
}

export function sendRecoveryEmail(email: string, redirectTo: string) {
  const url = import.meta.env["VITE_SUPABASE_URL"] as string | undefined;
  const key = import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined;
  if (!url || !key) throw new Error("Password reset is unavailable right now.");

  const client = createClient(url, key, {
    global: { fetch: keyedFetch(key) },
    auth: {
      flowType: "implicit",
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  return client.auth.resetPasswordForEmail(email, { redirectTo });
}
