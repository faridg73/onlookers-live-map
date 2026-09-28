// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  callerAddress,
  RATE_LIMITED_MESSAGE,
  RATE_LIMITS,
  withinRateLimit,
} from "@/lib/rate-limit.server";

const phoneInput = z.object({
  phone: z.string().trim().min(7).max(24),
  email: z.string().trim().toLowerCase().email().max(255),
  humanToken: z.string().max(4000).optional(),
  humanAction: z.enum(["sms-code", "sign-up"]).optional(),
});

/** Sends a one-time code by text before an account is created. */
export const sendPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => phoneInput.parse(data))
  .handler(async ({ data }): Promise<{ ok: boolean; phone?: string; proof?: string; error?: string }> => {
    // Bots must clear the silent challenge before we spend an SMS.
    const { assertHuman } = await import("@/lib/turnstile.functions");
    try {
      await assertHuman(data.humanToken, data.humanAction ?? "sms-code");
    } catch {
      return { ok: false, error: "The security check didn't pass. Please try again." };
    }

    const { normalizePhone } = await import("@/lib/sms.server");
    const number = normalizePhone(data.phone);
    if (!number) return { ok: false, error: "That mobile number does not look right." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: existing } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("phone", number)
      .limit(1);
    if (existing && existing.length > 0) {
      return { ok: false, error: "That number is already linked to another account. Sign in instead." };
    }

    const address = callerAddress();
    const perAddress = await withinRateLimit(RATE_LIMITS.sms, `verify:${address}`);
    const perNumber = await withinRateLimit(RATE_LIMITS.sms, `verify:num:${number}`);
    if (!perAddress || !perNumber) return { ok: false, error: RATE_LIMITED_MESSAGE };

    const { startPhoneVerification } = await import("@/lib/phone-verify.server");
    const result = await startPhoneVerification(number);
    if (!result.ok) return { ok: false, error: result.error };
    return { ok: true, phone: number };
  });

/** Confirms the texted code and records the number so the new account can claim it. */
export const confirmPhoneCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    phoneInput.extend({ code: z.string().trim().regex(/^\d{4,10}$/) }).parse(data),
  )
  .handler(async ({ data }): Promise<{ ok: boolean; phone?: string; proof?: string; error?: string }> => {
    const { normalizePhone } = await import("@/lib/sms.server");
    const number = normalizePhone(data.phone);
    if (!number) return { ok: false, error: "That mobile number does not look right." };

    const address = callerAddress();
    if (!(await withinRateLimit(RATE_LIMITS.auth, `verify-check:${address}`))) {
      return { ok: false, error: RATE_LIMITED_MESSAGE };
    }

    const { checkPhoneVerification } = await import("@/lib/phone-verify.server");
    const result = await checkPhoneVerification(number, data.code);
    if (!result.ok) return { ok: false, error: result.error };

    const { issueSignupProof } = await import("@/lib/signup-verification.server");
    const proof = await issueSignupProof("phone", number, data.email);
    return { ok: true, phone: number, proof };
  });
