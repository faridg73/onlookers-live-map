// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Server-only phone verification through Twilio Verify, called via the Lovable
 * connector gateway. The app never handles Twilio credentials directly — the
 * gateway signs each request with the linked connection.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

export type VerifyStart = { ok: true } | { ok: false; error: string };
export type VerifyCheck = { ok: true } | { ok: false; error: string };

function credentials():
  | { ok: true; lovableKey: string; connectionKey: string; service: string }
  | { ok: false; error: string } {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["TWILIO_API_KEY"];
  const service = process.env["TWILIO_VERIFY_SERVICE_SID"];
  if (!lovableKey || !connectionKey || !service) {
    return { ok: false, error: "Phone verification is not configured yet." };
  }
  return { ok: true, lovableKey, connectionKey, service };
}

async function verifyCall(
  path: string,
  form: Record<string, string>,
): Promise<{ ok: boolean; status: number; body: string }> {
  const creds = credentials();
  if (!creds.ok) return { ok: false, status: 0, body: creds.error };

  const response = await fetch(`${GATEWAY_URL}/verify/v2/Services/${creds.service}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${creds.lovableKey}`,
      "X-Connection-Api-Key": creds.connectionKey,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams(form),
  });
  const body = await response.text();
  return { ok: response.ok, status: response.status, body };
}

function providerMessage(body: string, fallback: string): string {
  try {
    const parsed = JSON.parse(body) as { message?: string };
    return parsed.message ?? fallback;
  } catch {
    return fallback;
  }
}

/** Texts a fresh one-time code to the number. */
export async function startPhoneVerification(phone: string): Promise<VerifyStart> {
  const creds = credentials();
  if (!creds.ok) return { ok: false, error: creds.error };

  try {
    const result = await verifyCall("/Verifications", { To: phone, Channel: "sms" });
    if (!result.ok) {
      console.error(`[verify] start failed [${result.status}]: ${result.body}`);
      return {
        ok: false,
        error: providerMessage(result.body, "We couldn't text that number. Please check it."),
      };
    }
    return { ok: true };
  } catch (error) {
    console.error("[verify] start threw", error);
    return { ok: false, error: "Could not reach the texting service." };
  }
}

/** Checks a code the person typed in. */
export async function checkPhoneVerification(phone: string, code: string): Promise<VerifyCheck> {
  const creds = credentials();
  if (!creds.ok) return { ok: false, error: creds.error };

  try {
    const result = await verifyCall("/VerificationCheck", { To: phone, Code: code });
    if (!result.ok) {
      console.error(`[verify] check failed [${result.status}]: ${result.body}`);
      return { ok: false, error: "That code didn't work. Ask for a new one and try again." };
    }
    const parsed = JSON.parse(result.body) as { status?: string; valid?: boolean };
    if (parsed.valid === true && parsed.status === "approved") return { ok: true };
    return { ok: false, error: "That code isn't right. Please check it and try again." };
  } catch (error) {
    console.error("[verify] check threw", error);
    return { ok: false, error: "Could not reach the texting service." };
  }
}
