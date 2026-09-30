// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Tells the forgot-password screen whether an address signs in with a
 * social provider only (no password to reset). Unknown addresses return
 * "unknown" so the screen still shows the generic "check your email" note.
 */
export const checkResetEligibility = createServerFn({ method: "POST" })
  .inputValidator((d) => z.object({ email: z.string().trim().email().max(255) }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: providers, error } = await supabaseAdmin.rpc(
      "auth_providers_for_email" as never,
      { _email: data.email } as never,
    );
    if (error) return { status: "unknown" as const, providers: [] as string[] };
    const list = ((providers as unknown as string[] | null) ?? []).filter(Boolean);
    if (list.length === 0) return { status: "unknown" as const, providers: list };
    if (list.includes("email")) return { status: "password" as const, providers: list };
    return { status: "social" as const, providers: list };
  });
