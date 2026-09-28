// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
const PROOF_TTL_MS = 15 * 60 * 1000;

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function issueSignupProof(kind: "email" | "phone", destination: string, bindingEmail: string) {
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin.from("signup_verification_proofs").insert({
    proof_hash: await sha256(token), verification_kind: kind, destination,
    binding_email: bindingEmail.trim().toLowerCase(),
    expires_at: new Date(Date.now() + PROOF_TTL_MS).toISOString(),
  });
  if (error) throw new Error("Could not save verification. Please try again.");
  return token;
}

export async function consumeSignupProofs(input: { email: string; phone: string; emailProof: string; phoneProof: string }) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const now = new Date().toISOString();
  const email = input.email.trim().toLowerCase();
  const hashes = await Promise.all([sha256(input.emailProof), sha256(input.phoneProof)]);
  const { data, error } = await supabaseAdmin.from("signup_verification_proofs")
    .select("proof_hash, verification_kind, destination, binding_email")
    .in("proof_hash", hashes).is("consumed_at", null).gt("expires_at", now);
  if (error || !data || data.length !== 2) return false;
  const emailRow = data.find((row) => row.verification_kind === "email");
  const phoneRow = data.find((row) => row.verification_kind === "phone");
  if (emailRow?.destination !== email || emailRow.binding_email !== email || phoneRow?.destination !== input.phone || phoneRow.binding_email !== email) return false;
  const { error: consumeError } = await supabaseAdmin.from("signup_verification_proofs")
    .update({ consumed_at: now }).in("proof_hash", hashes).is("consumed_at", null);
  return !consumeError;
}