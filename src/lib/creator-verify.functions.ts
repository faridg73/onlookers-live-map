// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";

const numberInput = z.object({ phone: z.string().trim().min(7).max(24) });

type Sent = { ok: boolean; phone?: string; error?: string };
type Confirmed = { ok: boolean; phone?: string; error?: string };

/** Texts a 6-digit code to the signed-in creator's mobile number. */
export const sendCreatorPhoneCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => numberInput.parse(data))
  .handler(async ({ data, context }): Promise<Sent> => {
    const { normalizePhone } = await import("@/lib/sms.server");
    const number = normalizePhone(data.phone);
    if (!number) return { ok: false, error: "That mobile number does not look right." };

    const perUser = await withinRateLimit(RATE_LIMITS.sms, `creator-verify:${context.userId}`);
    const perNumber = await withinRateLimit(RATE_LIMITS.sms, `creator-verify:num:${number}`);
    if (!perUser || !perNumber) return { ok: false, error: RATE_LIMITED_MESSAGE };

    const { startPhoneVerification } = await import("@/lib/phone-verify.server");
    const result = await startPhoneVerification(number);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, phone: number };
  });

/** Checks the texted code and, when it matches, verifies the creator instantly. */
export const confirmCreatorPhoneCode = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    numberInput.extend({ code: z.string().trim().regex(/^\d{4,10}$/) }).parse(data),
  )
  .handler(async ({ data, context }): Promise<Confirmed> => {
    const { normalizePhone } = await import("@/lib/sms.server");
    const number = normalizePhone(data.phone);
    if (!number) return { ok: false, error: "That mobile number does not look right." };

    if (!(await withinRateLimit(RATE_LIMITS.auth, `creator-verify-check:${context.userId}`))) {
      return { ok: false, error: RATE_LIMITED_MESSAGE };
    }

    const { checkPhoneVerification } = await import("@/lib/phone-verify.server");
    const check = await checkPhoneVerification(number, data.code);
    if (!check.ok) return { ok: false, error: check.error };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("mark_creator_verified", {
      _user_id: context.userId,
      _phone: number,
    });
    if (error) {
      console.error("[creator-verify] could not mark verified", error);
      return {
        ok: false,
        error: "Your number was confirmed but we couldn't finish verifying. Please try again.",
      };
    }
    return { ok: true, phone: number };
  });
