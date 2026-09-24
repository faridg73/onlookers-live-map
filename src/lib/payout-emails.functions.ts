// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Emails the Onlooker (hunter) after the Poster accepts their clip and the
 * escrow payout is released. Called right after a successful accept; the
 * idempotency key makes retries safe.
 */
export const notifyPayoutReleased = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ videoId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: video, error } = await supabase
      .from("bounty_videos")
      .select("id, request_id, uploader_id, request_title, request_place, payout_amount, accepted_by, accepted_at")
      .eq("id", data.videoId)
      .single();
    if (error || !video) return { sent: false as const, reason: "not_found" };

    // Only the Poster who accepted the clip may trigger this email.
    if (!video.accepted_at || video.accepted_by !== userId) {
      return { sent: false as const, reason: "not_accepted_by_caller" };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: hunterUser, error: hunterErr } = await supabaseAdmin.auth.admin.getUserById(video.uploader_id);
    const hunterEmail = hunterUser?.user?.email?.trim();
    if (hunterErr || !hunterEmail) return { sent: false as const, reason: "no_hunter_email" };

    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("display_name, username")
      .eq("id", video.uploader_id)
      .maybeSingle();

    const requestId = video.request_id.replace(/^db-/, "");
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
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
    return result;
  });
