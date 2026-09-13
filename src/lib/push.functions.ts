import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

/**
 * Stores (or updates) a Firebase device token for the signed-in user so the
 * geofenced bounty alert engine can wake this device.
 */
export const savePushToken = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        token: z.string().min(1),
        platform: z.enum(["web", "android", "ios"]).default("web"),
      })
      .parse(data),
  )
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const userId = context.userId;
    if (!userId) return { ok: false, error: "Not signed in." };

    const { supabase } = context;
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        token: data.token,
        platform: data.platform,
      },
      { onConflict: "token" },
    );

    if (error) {
      console.error("[push] save token failed", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  });

/**
 * Removes a device token when the user disables push or the device is logged out.
 */
export const removePushToken = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((data: unknown) => z.object({ token: z.string().min(1) }).parse(data))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const userId = context.userId;
    if (!userId) return { ok: false, error: "Not signed in." };

    const { supabase } = context;
    const { error } = await supabase.from("push_tokens").delete().eq("user_id", userId).eq("token", data.token);

    if (error) {
      console.error("[push] remove token failed", error);
      return { ok: false, error: error.message };
    }
    return { ok: true };
  });
