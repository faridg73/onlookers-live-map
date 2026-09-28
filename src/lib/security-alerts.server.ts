// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";
import { sendSms } from "@/lib/sms.server";

/** Texts and emails the member right away when their payout bank changes. Never throws. */
export async function alertPayoutMethodChanged(userId: string, eventKey: string) {
  try {
    const [{ data: authUser }, { data: profile }] = await Promise.all([
      supabaseAdmin.auth.admin.getUserById(userId),
      supabaseAdmin.from("profiles").select("display_name, username, phone").eq("id", userId).maybeSingle(),
    ]);
    const name = profile?.display_name || profile?.username || "";
    const when = new Date().toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/Los_Angeles", timeZoneName: "short",
    });
    const email = authUser?.user?.email?.trim();
    const jobs: Promise<unknown>[] = [];
    if (email) {
      jobs.push(
        sendTemplateEmail("payout-method-changed", email, {
          templateData: { name, when, securityUrl: "https://www.onlooker.io/balance" },
          idempotencyKey: `payout-method-changed-${eventKey}`,
        }),
      );
    }
    if (profile?.phone) {
      jobs.push(
        sendSms(
          profile.phone,
          `Onlooker: your payout bank was changed (${when}). Cash-outs are paused 24h. Not you? Freeze your account now at onlooker.io/balance`,
        ),
      );
    }
    const results = await Promise.allSettled(jobs);
    await supabaseAdmin.from("payout_security_logs").insert({
      user_id: userId,
      event_type: "payout_change_alert_sent",
      details: { email: Boolean(email), sms: Boolean(profile?.phone), failures: results.filter((r) => r.status === "rejected").length },
    });
  } catch (error) {
    console.error("[security] payout change alert failed", { userId, error });
  }
}
