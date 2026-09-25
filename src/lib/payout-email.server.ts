// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

type VideoRow = {
  id: string;
  request_id: string;
  uploader_id: string;
  request_title: string | null;
  request_place: string | null;
  payout_amount: number | string | null;
};

/** Sends the payout-released email for one accepted clip, then marks it sent. */
export async function sendPayoutEmailForVideo(video: VideoRow) {
  const { data: hunterUser, error } = await supabaseAdmin.auth.admin.getUserById(video.uploader_id);
  const hunterEmail = hunterUser?.user?.email?.trim();
  if (error || !hunterEmail) return { sent: false as const, reason: "no_hunter_email" };

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("display_name, username")
    .eq("id", video.uploader_id)
    .maybeSingle();

  const requestId = video.request_id.replace(/^db-/, "");
  const result = await sendTemplateEmail("payout-released", hunterEmail, {
    templateData: {
      hunterName: profile?.display_name || profile?.username || "",
      bountyTitle: video.request_title,
      place: video.request_place,
      credits: Math.round(Number(video.payout_amount)),
      bountyUrl: `https://onlookerlive.com/b/${requestId}`,
    },
    idempotencyKey: `payout-released-${video.id}`,
  });
  await supabaseAdmin.rpc("mark_payout_email_sent" as never, { _video_id: video.id } as never);
  return result;
}

/** Emails every auto-released payout that hasn't been emailed yet. */
export async function sendPendingPayoutEmails() {
  const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const { data } = await supabaseAdmin
    .from("bounty_videos")
    .select("id, request_id, uploader_id, request_title, request_place, payout_amount")
    .not("accepted_at", "is", null)
    .is("payout_email_sent_at" as never, null)
    .gt("accepted_at", since)
    .gt("payout_amount", 0)
    .limit(50);
  let sent = 0;
  for (const v of (data ?? []) as VideoRow[]) {
    try {
      const r = await sendPayoutEmailForVideo(v);
      if (r.sent) sent++;
    } catch (e) {
      console.error("payout email failed", v.id, e);
    }
  }
  return sent;
}
