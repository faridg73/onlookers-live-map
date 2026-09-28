// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { callerAddress, RATE_LIMITED_MESSAGE, RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";

const emailSchema = z.string().trim().toLowerCase().email().max(255);
const codeSchema = z.string().trim().regex(/^\d{6}$/);
const proofSchema = z.string().min(60).max(160);

export const sendEmailSignupCode = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => z.object({ email: emailSchema }).parse(value))
  .handler(async ({ data }) => {
    const allowed = await withinRateLimit(RATE_LIMITS.auth, `email-code:${callerAddress()}:${data.email}`);
    if (!allowed) return { ok: false as const, error: RATE_LIMITED_MESSAGE };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: users, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
      if (error) throw error;
      if (users.users.some((user) => user.email?.toLowerCase() === data.email)) {
        return { ok: false as const, error: "An account already exists for that email. Sign in instead." };
      }
      const { startEmailVerification } = await import("@/lib/email-verify.server");
      await startEmailVerification(data.email);
      return { ok: true as const };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "Could not send the code." };
    }
  });

export const confirmEmailSignupCode = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => z.object({ email: emailSchema, code: codeSchema }).parse(value))
  .handler(async ({ data }) => {
    const allowed = await withinRateLimit(RATE_LIMITS.auth, `email-check:${callerAddress()}:${data.email}`);
    if (!allowed) return { ok: false as const, error: RATE_LIMITED_MESSAGE };
    try {
      const { checkEmailVerification } = await import("@/lib/email-verify.server");
      await checkEmailVerification(data.email, data.code);
      const { issueSignupProof } = await import("@/lib/signup-verification.server");
      return { ok: true as const, proof: await issueSignupProof("email", data.email, data.email) };
    } catch (error) {
      return { ok: false as const, error: error instanceof Error ? error.message : "That code didn't work." };
    }
  });

export const completeVerifiedSignup = createServerFn({ method: "POST" })
  .inputValidator((value: unknown) => z.object({
    email: emailSchema,
    phone: z.string().regex(/^\+[1-9]\d{7,14}$/),
    emailProof: proofSchema,
    phoneProof: proofSchema,
    password: z.string().min(10).max(128).regex(/[A-Z]/).regex(/[a-z]/).regex(/\d/).regex(/[^A-Za-z0-9]/),
    firstName: z.string().trim().min(2).max(60),
    lastName: z.string().trim().min(2).max(60),
    username: z.string().trim().min(3).max(24).regex(/^[a-zA-Z0-9._]+$/),
  }).parse(value))
  .handler(async ({ data }) => {
    const allowed = await withinRateLimit(RATE_LIMITS.auth, `signup-complete:${callerAddress()}:${data.email}`);
    if (!allowed) return { ok: false as const, error: RATE_LIMITED_MESSAGE };
    const { consumeSignupProofs } = await import("@/lib/signup-verification.server");
    if (!(await consumeSignupProofs(data))) {
      return { ok: false as const, error: "One of your verifications expired or no longer matches. Verify both again." };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
      user_metadata: {
        phone: data.phone,
        first_name: data.firstName,
        last_name: data.lastName,
        username: data.username,
      },
    });
    if (error || !created.user) {
      const duplicate = /already|registered|exists/i.test(error?.message ?? "");
      return { ok: false as const, error: duplicate ? "An account already exists for that email or phone. Sign in instead." : (error?.message ?? "Could not create your account.") };
    }
    await supabaseAdmin.from("phone_verifications").upsert(
      { phone: data.phone, email: data.email, verified_at: new Date().toISOString() },
      { onConflict: "phone" },
    );
    return { ok: true as const };
  });