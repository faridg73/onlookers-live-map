/**
 * Server-only text messaging through the Twilio connector gateway. The app
 * never sees Twilio credentials — the gateway signs each request.
 */
const GATEWAY_URL = "https://connector-gateway.lovable.dev/twilio";

/** Turns what someone typed into an E.164 number, assuming US when no country is given. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (trimmed.startsWith("+")) return digits.length >= 8 ? `+${digits}` : null;
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return digits.length >= 11 ? `+${digits}` : null;
}

export type SmsResult = { ok: true; sid: string } | { ok: false; error: string };

/** Sends one text message. Never throws — callers get a readable failure instead. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["TWILIO_API_KEY"];
  const from = process.env["TWILIO_FROM_NUMBER"];

  if (!lovableKey || !connectionKey) {
    return { ok: false, error: "The texting service is not connected yet." };
  }
  if (!from) {
    return { ok: false, error: "No sending phone number is configured for texts yet." };
  }

  const number = normalizePhone(to);
  if (!number) {
    return { ok: false, error: "That mobile number does not look right." };
  }

  try {
    const response = await fetch(`${GATEWAY_URL}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": connectionKey,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({ To: number, From: from, Body: body }),
    });

    const text = await response.text();
    if (!response.ok) {
      console.error(`[sms] send failed [${response.status}]: ${text}`);
      let message = `Text delivery failed (${response.status}).`;
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed.message) message = parsed.message;
      } catch {
        /* keep the generic message */
      }
      return { ok: false, error: message };
    }

    const parsed = JSON.parse(text) as { sid?: string };
    return { ok: true, sid: parsed.sid ?? "" };
  } catch (error) {
    console.error("[sms] send threw", error);
    return { ok: false, error: "Could not reach the texting service." };
  }
}
