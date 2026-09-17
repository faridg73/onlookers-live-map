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
  // A leading "+" is often typed without a country code (e.g. "+310 400 9981"),
  // so fall through to the US rules whenever the digits look like a US number.
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (trimmed.startsWith("+")) return digits.length >= 8 ? `+${digits}` : null;
  return digits.length >= 11 ? `+${digits}` : null;
}

/** Plain-language explanations for the Twilio failures we can actually hit. */
function statusProblem(status: string, errorCode: number | null): string | null {
  if (status !== "failed" && status !== "undelivered") return null;
  switch (errorCode) {
    case 30034:
      return "Your Twilio number isn't registered for US A2P 10DLC messaging yet, so carriers are blocking these texts. Register the number in Twilio, then try again.";
    case 21211:
    case 21614:
      return "That mobile number isn't a valid text-capable number.";
    case 21610:
      return "That number has replied STOP, so we can't text it.";
    case 21408:
    case 21612:
      return "Your Twilio number can't send texts to that destination.";
    default:
      return `The carrier rejected the text${errorCode ? ` (error ${errorCode})` : ""}.`;
  }
}

export type SmsResult = { ok: true; sid: string } | { ok: false; error: string };


/**
 * Polls a just-sent message for a few seconds. Returns a readable problem when
 * the carrier rejected it, or null when it looks fine (still queued is fine).
 */
async function confirmDelivery(
  sid: string,
  lovableKey: string,
  connectionKey: string,
): Promise<string | null> {
  if (!sid) return null;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    try {
      const response = await fetch(`${GATEWAY_URL}/Messages/${sid}.json`, {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": connectionKey,
        },
      });
      if (!response.ok) return null;
      const message = (await response.json()) as { status?: string; error_code?: number | null };
      const problem = statusProblem(message.status ?? "", message.error_code ?? null);
      if (problem) {
        console.error(`[sms] ${sid} ${message.status} error ${message.error_code}`);
        return problem;
      }
      if (message.status === "sent" || message.status === "delivered") return null;
    } catch (error) {
      console.error("[sms] status check threw", error);
      return null;
    }
  }
  return null;
}

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

    const parsed = JSON.parse(text) as { sid?: string; status?: string; error_code?: number | null };
    const sid = parsed.sid ?? "";

    // Twilio accepts the request first and only reports carrier rejections a
    // moment later, so confirm the message really left before claiming success.
    const immediate = statusProblem(parsed.status ?? "", parsed.error_code ?? null);
    if (immediate) {
      console.error(`[sms] rejected on create ${sid}: ${parsed.status} ${parsed.error_code}`);
      return { ok: false, error: immediate };
    }

    const settled = await confirmDelivery(sid, lovableKey, connectionKey);
    if (settled) return { ok: false, error: settled };
    return { ok: true, sid };

  } catch (error) {
    console.error("[sms] send threw", error);
    return { ok: false, error: "Could not reach the texting service." };
  }
}
