// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { sendLovableEmail } from "@lovable.dev/email-js";

import { normalizePhone, sendSms } from "@/lib/sms.server";

const SITE_URL = "https://onlookerlive.com";

/**
 * Server-only delivery of a real-estate bounty's 6-digit on-site PIN to the
 * listing agent, by SMS and/or email. Never import from client code.
 */
export type AgentContact = { name?: string; phone?: string; email?: string };

export type AgentPinDelivery = {
  sms: boolean;
  email: boolean;
  smsError?: string;
  emailError?: string;
};

type PinOpts = {
  pin: string;
  requestId: string;
  locationName: string;
  /** One-time token letting the agent decline the visit without an account. */
  declineToken?: string | null;
};

/** Account-free link the agent taps when they never authorized the visit. */
function declineUrl(token?: string | null) {
  return token ? `${SITE_URL}/pin-decline?t=${encodeURIComponent(token)}` : null;
}

function smsBody(opts: PinOpts) {
  const decline = declineUrl(opts.declineToken);
  return (
    `Onlooker: the single-use 6-digit on-site PIN for "${opts.locationName}" is ${opts.pin}. ` +
    `Give it only to the onlooker filming your property; it works once and expires when the request closes. ` +
    `Bounty: ${SITE_URL}/?b=${opts.requestId}` +
    (decline ? ` Not authorized? Cancel it: ${decline}` : "")
  );
}

function emailBody(opts: PinOpts & { name: string }) {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hello,";
  return `<!doctype html><html><body style="margin:0;background:#0f0f0f;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:28px;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#ccff00;font-weight:bold;">ONLOOKER · ON-SITE VERIFICATION</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">Your 6-digit PIN</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${greeting} a paid Onlooker bounty was posted for
    <strong style="color:#ffffff;">${opts.locationName}</strong>. Hand this PIN only to the onlooker filming
    your property — they type it in on site to unlock footage submission and payout.</p>
    <p style="margin:0 0 20px;"><span style="display:inline-block;background:#000;border:1px solid #ccff00;color:#ccff00;font-size:30px;font-weight:bold;letter-spacing:10px;padding:14px 22px;border-radius:12px;">${opts.pin}</span></p>
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#a3a3a3;">This PIN can be used once and stops working when the request closes.</p>
    <p style="margin:0 0 8px;font-size:13px;color:#a3a3a3;">Bounty link:</p>
    <p style="margin:0 0 16px;"><a href="${SITE_URL}/?b=${opts.requestId}" style="color:#ccff00;font-size:13px;word-break:break-all;">${SITE_URL}/?b=${opts.requestId}</a></p>
    ${declineUrl(opts.declineToken) ? `<p style="margin:0;font-size:13px;line-height:1.6;color:#a3a3a3;">Did you not authorize this? <a href="${declineUrl(opts.declineToken)}" style="color:#ccff00;">Cancel this request</a> — no account needed.</p>` : ""}
  </div>
</body></html>`;
}

function emailText(opts: PinOpts & { name: string }) {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hello,";
  return (
    `${greeting} a paid Onlooker bounty was posted for "${opts.locationName}".\n\n` +
    `Your 6-digit on-site PIN: ${opts.pin}\n\n` +
    `Give it only to the onlooker filming your property — they type it in on site to unlock ` +
    `footage submission and payout. It can be used once and stops working when the request closes.` +
    `\n\nBounty: ${SITE_URL}/?b=${opts.requestId}` +
    (declineUrl(opts.declineToken) ? `\n\nDid you not authorize this? Cancel it here: ${declineUrl(opts.declineToken)}` : "")
  );
}

/**
 * Sends the PIN to whichever agent contact was provided. Each channel is
 * attempted independently; failures are reported, never thrown, so a texting
 * or email problem cannot block the bounty from going live.
 */
export async function sendAgentPin(
  contact: AgentContact,
  opts: PinOpts,
): Promise<AgentPinDelivery> {
  const result: AgentPinDelivery = { sms: false, email: false };
  const phone = (contact.phone ?? "").trim();
  const email = (contact.email ?? "").trim();
  const name = (contact.name ?? "").trim();

  if (phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) {
      result.smsError = "That phone number could not be recognized.";
    } else {
      const sms = await sendSms(normalized, smsBody(opts));
      if (sms.ok) result.sms = true;
      else result.smsError = sms.error;
    }
  }

  if (email) {
    try {
      const apiKey = process.env["LOVABLE_API_KEY"];
      if (!apiKey) throw new Error("Email sending is not configured.");
      const response = await sendLovableEmail(
        {
          to: email,
          from: "Onlooker <noreply@onlookerlive.com>",
          sender_domain: "notify.onlookerlive.com",
          subject: `Onlooker on-site PIN: ${opts.pin}`,
          html: emailBody({ ...opts, name }),
          text: emailText({ ...opts, name }),
          purpose: "transactional",
          label: "agent-site-pin",
          idempotency_key: crypto.randomUUID(),
        },
        { apiKey },
      );
      result.email = response.success;
      if (!response.success) result.emailError = response.status ?? "Email provider rejected the send.";
    } catch (error) {
      result.emailError = error instanceof Error ? error.message : "Email failed.";
    }
  }

  return result;
}
