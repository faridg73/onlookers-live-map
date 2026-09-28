// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function hashCode(email: string, code: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${email.trim().toLowerCase()}:${code}`));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function newCode(): string {
  const values = crypto.getRandomValues(new Uint32Array(1));
  return ((values[0] ?? 0) % 1_000_000).toString().padStart(6, "0");
}

export async function startEmailVerification(email: string) {
  const normalized = email.trim().toLowerCase();
  const code = newCode();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("email_otp_codes").upsert({
    email: normalized, code_hash: await hashCode(normalized, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(), attempts: 0,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error("Could not start email verification. Please try again.");
  const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
  const sent = await sendTemplateEmail("signup-code", normalized, {
    templateData: { code }, idempotencyKey: `signup-code-${normalized}-${Date.now()}`,
  });
  if (!sent.sent) throw new Error("Email delivery is unavailable for this address.");
}

export async function checkEmailVerification(email: string, code: string) {
  const normalized = email.trim().toLowerCase();
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin.from("email_otp_codes")
    .select("code_hash, expires_at, attempts").eq("email", normalized).maybeSingle();
  if (!row) throw new Error("No code was sent to this email. Send a new one.");
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("email_otp_codes").delete().eq("email", normalized);
    throw new Error("That code has expired. Send a new one.");
  }
  if (row.attempts >= MAX_ATTEMPTS) throw new Error("Too many wrong tries. Send a new code.");
  if ((await hashCode(normalized, code)) !== row.code_hash) {
    await supabaseAdmin.from("email_otp_codes").update({ attempts: row.attempts + 1 }).eq("email", normalized);
    throw new Error("That code isn't right. Check it and try again.");
  }
  await supabaseAdmin.from("email_otp_codes").delete().eq("email", normalized);
}