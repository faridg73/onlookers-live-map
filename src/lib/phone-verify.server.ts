// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Server-only phone verification: we generate a 6-digit code, store only its
 * hash, and text it through Signal House. Never import from client code.
 */
import { sendSms } from "@/lib/sms.server";

export type VerifyStart = { ok: true } | { ok: false; error: string };
export type VerifyCheck = { ok: true } | { ok: false; error: string };

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

async function hashCode(phone: string, code: string): Promise<string> {
  const data = new TextEncoder().encode(`${phone}:${code}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function newCode(): string {
  const n = crypto.getRandomValues(new Uint32Array(1))[0] % 1_000_000;
  return n.toString().padStart(6, "0");
}

/** Texts a fresh one-time code to the number. */
export async function startPhoneVerification(phone: string): Promise<VerifyStart> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const code = newCode();
  const { error } = await supabaseAdmin.from("phone_otp_codes").upsert({
    phone,
    code_hash: await hashCode(phone, code),
    expires_at: new Date(Date.now() + CODE_TTL_MS).toISOString(),
    attempts: 0,
    updated_at: new Date().toISOString(),
  });
  if (error) {
    console.error("[verify] could not store code", error);
    return { ok: false, error: "Could not start verification. Please try again." };
  }
  const sent = await sendSms(
    phone,
    `Onlooker: your verification code is ${code}. It expires in 10 minutes. Don't share it with anyone.`,
  );
  if (!sent.ok) return { ok: false, error: sent.error };
  return { ok: true };
}

/** Checks a code the person typed in. */
export async function checkPhoneVerification(phone: string, code: string): Promise<VerifyCheck> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: row } = await supabaseAdmin
    .from("phone_otp_codes")
    .select("code_hash, expires_at, attempts")
    .eq("phone", phone)
    .maybeSingle();
  if (!row) return { ok: false, error: "No code was sent to this number. Ask for a new one." };
  if (new Date(row.expires_at).getTime() < Date.now()) {
    await supabaseAdmin.from("phone_otp_codes").delete().eq("phone", phone);
    return { ok: false, error: "That code has expired. Ask for a new one." };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    return { ok: false, error: "Too many wrong tries. Ask for a new code." };
  }
  if ((await hashCode(phone, code.trim())) !== row.code_hash) {
    await supabaseAdmin
      .from("phone_otp_codes")
      .update({ attempts: row.attempts + 1 })
      .eq("phone", phone);
    return { ok: false, error: "That code isn't right. Please check it and try again." };
  }
  await supabaseAdmin.from("phone_otp_codes").delete().eq("phone", phone);
  return { ok: true };
}
