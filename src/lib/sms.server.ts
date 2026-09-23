// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
/**
 * Server-only text messaging through Signal House. Never import from client code.
 */
const DEFAULT_BASE_URL = "https://v2.signalhouse.io";
const STATUS_CALLBACK_PATH = "/api/public/webhooks/signalhouse";
const SITE_URL = "https://onlookerlive.com";

/** Turns what someone typed into an E.164 number, assuming US when no country is given. */
export function normalizePhone(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const digits = trimmed.replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+")) return digits.length >= 8 ? `+${digits}` : null;
  return digits.length >= 11 ? `+${digits}` : null;
}

export type SmsResult = { ok: true; sid: string } | { ok: false; error: string };

function readableError(status: number, text: string): string {
  let message = "";
  try {
    const parsed = JSON.parse(text) as { error?: unknown; message?: unknown };
    const raw = parsed.error ?? parsed.message;
    if (typeof raw === "string") message = raw;
    else if (raw && typeof raw === "object" && "message" in raw) message = String((raw as { message: unknown }).message);
  } catch {
    /* not JSON */
  }
  if (status === 401 || status === 403) {
    return "The texting service rejected our credentials. The Signal House API key needs to be checked.";
  }
  return message || `Text delivery failed (${status}).`;
}

/** Sends one text message. Never throws — callers get a readable failure instead. */
export async function sendSms(to: string, body: string): Promise<SmsResult> {
  const apiKey = process.env["SIGNALHOUSE_API_KEY"];
  const from = process.env["SIGNALHOUSE_FROM_NUMBER"];
  const baseUrl = (process.env["SIGNALHOUSE_BASE_URL"] || DEFAULT_BASE_URL).replace(/\/$/, "");
  const webhookToken = process.env["SIGNALHOUSE_WEBHOOK_TOKEN"];

  if (!apiKey) return { ok: false, error: "The texting service is not connected yet." };
  if (!from) return { ok: false, error: "No sending phone number is configured for texts yet." };

  const number = normalizePhone(to);
  if (!number) return { ok: false, error: "That mobile number does not look right." };

  const payload: Record<string, unknown> = {
    senderPhoneNumber: from.replace(/[^\d]/g, ""),
    recipientPhoneNumber: [number.replace(/[^\d]/g, "")],
    messageBody: body,
    enableShortlink: false,
  };
  if (webhookToken) {
    payload["statusCallbackUrl"] = `${SITE_URL}${STATUS_CALLBACK_PATH}?token=${encodeURIComponent(webhookToken)}`;
  }

  try {
    const response = await fetch(`${baseUrl}/message/sms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`[sms] Signal House send failed [${response.status}]: ${text}`);
      return { ok: false, error: readableError(response.status, text) };
    }
    let sid = "";
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed["success"] === false) {
        console.error(`[sms] Signal House reported failure: ${text}`);
        return { ok: false, error: readableError(400, text) };
      }
      const data = (parsed["data"] ?? parsed) as Record<string, unknown> | Record<string, unknown>[];
      const first = Array.isArray(data) ? data[0] : data;
      const id = first?.["messageId"] ?? first?.["id"] ?? first?.["sid"];
      if (id != null) sid = String(id);
    } catch {
      /* accepted without a JSON body */
    }
    return { ok: true, sid };
  } catch (error) {
    console.error("[sms] send threw", error);
    return { ok: false, error: "Could not reach the texting service." };
  }
}
