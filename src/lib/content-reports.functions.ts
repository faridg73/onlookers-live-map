// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

const schema = z.object({
  target: z.enum(["post", "clip"]),
  id: z.string().uuid(),
  reason: z.string().trim().min(1).max(40),
  reasonLabel: z.string().trim().max(80).optional(),
  details: z.string().max(500).default(""),
});

/**
 * Files a report on a post or clip as the signed-in user, so it lands in the
 * staff review queue, then emails the support inbox. The report is saved even
 * if the email fails.
 */
export const submitContentReport = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: unknown) => schema.parse(input))
  .handler(async ({ data, context }): Promise<{ ok: boolean; error?: string }> => {
    const { data: row, error } = await context.supabase
      .from("content_reports")
      .insert({
        post_id: data.target === "post" ? data.id : null,
        video_id: data.target === "clip" ? data.id : null,
        reporter_id: context.userId,
        reason: data.reason,
        details: data.details.slice(0, 500),
      })
      .select("id")
      .single();
    if (error || !row) {
      if (error && /duplicate key/i.test(error.message)) {
        return { ok: false, error: `You already reported this ${data.target}.` };
      }
      return { ok: false, error: "Couldn't send that report. Please try again." };
    }

    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: target } =
        data.target === "post"
          ? await supabaseAdmin.from("community_posts").select("title").eq("id", data.id).maybeSingle()
          : await supabaseAdmin.from("bounty_videos").select("title:request_title").eq("id", data.id).maybeSingle();
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("content-report", "support@onlooker.io", {
        templateData: {
          kind: data.target,
          title: (target as { title?: string } | null)?.title ?? "",
          reason: data.reasonLabel ?? data.reason,
          details: data.details,
          reportId: row.id,
          reviewUrl: "https://onlooker.io/admin",
        },
        idempotencyKey: `content-report-${row.id}`,
      });
    } catch (err) {
      console.error("Content report email failed", err);
    }
    return { ok: true };
  });
