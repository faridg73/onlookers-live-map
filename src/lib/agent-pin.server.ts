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
    `When they arrive we'll text you a one-tap approval link. If you can't open it, give this code ONLY to the assigned Onlooker who claimed this visit; it works once and expires when the request closes. ` +
    `Bounty: ${SITE_URL}/?b=${opts.requestId}` +
    (decline ? ` Didn't authorize this? Tap to cancel the bounty: ${decline}` : "")
  );
}

function emailBody(opts: PinOpts & { name: string }) {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hello,";
  return `<!doctype html><html><body style="margin:0;background:#0f0f0f;padding:32px;font-family:Arial,Helvetica,sans-serif;color:#e5e5e5;">
  <div style="max-width:520px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:28px;">
    <p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#CCFF00;font-weight:bold;">ONLOOKER · ON-SITE VERIFICATION</p>
    <h1 style="margin:0 0 16px;font-size:22px;color:#ffffff;">Your 6-digit PIN</h1>
    <p style="margin:0 0 16px;font-size:14px;line-height:1.6;">${greeting} a paid Onlooker bounty was posted for
    <strong style="color:#ffffff;">${opts.locationName}</strong>. When the onlooker arrives, we'll send you a one-tap
    approval link with their name and photo. If you can't open it, give this backup PIN <strong style="color:#ffffff;">only to the assigned Onlooker</strong>
    who claimed this visit — they type it in on site to unlock filming and payout.</p>
    <p style="margin:0 0 20px;"><span style="display:inline-block;background:#000;border:1px solid #CCFF00;color:#CCFF00;font-size:30px;font-weight:bold;letter-spacing:10px;padding:14px 22px;border-radius:12px;">${opts.pin}</span></p>
    <p style="margin:0 0 16px;font-size:13px;line-height:1.6;color:#a3a3a3;">This PIN can be used once and stops working when the request closes.</p>
    <p style="margin:0 0 8px;font-size:13px;color:#a3a3a3;">Bounty link:</p>
    <p style="margin:0 0 16px;"><a href="${SITE_URL}/?b=${opts.requestId}" style="color:#CCFF00;font-size:13px;word-break:break-all;">${SITE_URL}/?b=${opts.requestId}</a></p>
    ${declineUrl(opts.declineToken) ? `<p style="margin:0;font-size:13px;line-height:1.6;color:#a3a3a3;">Didn't authorize this visit? <a href="${declineUrl(opts.declineToken)}" style="color:#CCFF00;">Tap here to cancel the bounty</a> — no account needed.</p>` : ""}
  </div>
</body></html>`;
}

function emailText(opts: PinOpts & { name: string }) {
  const greeting = opts.name ? `Hi ${opts.name},` : "Hello,";
  return (
    `${greeting} a paid Onlooker bounty was posted for "${opts.locationName}".\n\n` +
    `Your 6-digit on-site PIN: ${opts.pin}\n\n` +
    `When the onlooker arrives we'll send you a one-tap approval link. If you can't open it, give this ` +
    `backup PIN ONLY to the assigned Onlooker who claimed this visit. It works once and stops working when the request closes.` +
    `\n\nBounty: ${SITE_URL}/?b=${opts.requestId}` +
    (declineUrl(opts.declineToken) ? `\n\nDidn't authorize this visit? Tap to cancel the bounty: ${declineUrl(opts.declineToken)}` : "")
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

/** Sends the one-hour "approve this onlooker" link after the Hunter checks in. */
export async function sendAgentApprovalLink(
  contact: AgentContact,
  opts: { token: string; locationName: string; hunterName: string },
): Promise<AgentPinDelivery> {
  const result: AgentPinDelivery = { sms: false, email: false };
  const url = `${SITE_URL}/visit-approve?t=${encodeURIComponent(opts.token)}`;
  const phone = (contact.phone ?? "").trim();
  const email = (contact.email ?? "").trim();
  const text =
    `Onlooker: ${opts.hunterName} says they're on site at "${opts.locationName}". ` +
    `Tap to approve or deny them (link works 60 min): ${url}`;
  if (phone) {
    const normalized = normalizePhone(phone);
    if (!normalized) result.smsError = "That phone number could not be recognized.";
    else {
      const sms = await sendSms(normalized, text);
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
          label: "agent-site-approval",
          idempotency_key: crypto.randomUUID(),
          subject: `Approve the onlooker at ${opts.locationName}`,
          html: `<!doctype html><html><body style="margin:0;background:#0f0f0f;padding:32px;font-family:Arial,sans-serif;color:#e5e5e5;"><div style="max-width:520px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;border-radius:16px;padding:28px;"><p style="margin:0 0 4px;font-size:12px;letter-spacing:2px;color:#CCFF00;font-weight:bold;">ONLOOKER · ON-SITE APPROVAL</p><h1 style="margin:0 0 16px;font-size:22px;color:#fff;">Is this the right person?</h1><p style="font-size:14px;line-height:1.6;"><strong style="color:#fff;">${opts.hunterName}</strong> says they're at <strong style="color:#fff;">${opts.locationName}</strong>. Open the link to see their photo and approve or deny them. It works for 60 minutes.</p><p><a href="${url}" style="display:inline-block;background:#CCFF00;color:#000;font-weight:bold;padding:12px 20px;border-radius:10px;text-decoration:none;">Review onlooker</a></p></div></body></html>`,
          text,
          purpose: "transactional",
        },
        { apiKey },
      );
      result.email = response.success;
      if (!response.success) result.emailError = response.status ?? "Email provider rejected the send.";
    } catch (err) {
      result.emailError = err instanceof Error ? err.message : "Email failed.";
    }
  }
  return result;
}
