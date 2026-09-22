// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createMiddleware } from "@tanstack/react-start";

import { supabase } from "@/integrations/supabase/client";

/**
 * Attaches the signed-in user's token to server function calls.
 *
 * While a token is mid-refresh, getSession() can briefly resolve without an
 * access token. Sending the call anyway makes the server reject it with
 * "Unauthorized: No authorization header provided", so we ask Supabase to
 * finish the refresh first and use the fresh token.
 */
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    let token: string | undefined;
    try {
      const { data } = await supabase.auth.getSession();
      token = data.session?.access_token;
      if (!token) {
        const { data: refreshed } = await supabase.auth.refreshSession();
        token = refreshed.session?.access_token;
      }
    } catch {
      token = undefined;
    }
    return next(token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  },
);
