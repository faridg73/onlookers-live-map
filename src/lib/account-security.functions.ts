// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

/** Freezes the signed-in member's account. Only a passed ID re-check can undo it. */
export const freezeMyAccount = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ ok?: true; error?: string }> => {
    const { error } = await context.supabase
      .from("profiles")
      .update({ account_frozen_at: new Date().toISOString() })
      .eq("id", context.userId)
      .is("account_frozen_at", null);
    if (error) return { error: error.message };
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("payout_security_logs").insert({
      user_id: context.userId,
      event_type: "account_frozen",
      details: {},
    });
    return { ok: true };
  });
