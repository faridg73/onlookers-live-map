// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { MODERATION_REASONS } from "@/lib/moderation-reasons";
import { RATE_LIMITED_MESSAGE, RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";
import { safeMultiline, safeText } from "@/lib/sanitize";

const reasonCodes = MODERATION_REASONS.map((reason) => reason.code) as [
  (typeof MODERATION_REASONS)[number]["code"],
  ...(typeof MODERATION_REASONS)[number]["code"][],
];

const dmcaSchema = z.object({
  name: safeText(100, 1),
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  contentUrl: z.string().trim().url({ message: "Enter a valid content URL" }).max(500),
  reasonCode: z.enum(reasonCodes),
  description: safeMultiline(3000, 20),
});

export type DmcaNoticeInput = z.infer<typeof dmcaSchema>;

/**
 * Submit a DMCA / infringement report. Stored for admin review and an alert
 * email goes to the support inbox. Public endpoint — input is validated and
 * the row is written with the server client so no client-side access exists.
 */
export const submitDmcaNotice = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => dmcaSchema.parse(data))
  .handler(async ({ data }): Promise<{ success: boolean; error?: string }> => {
    if (!(await withinRateLimit(RATE_LIMITS.dmca))) {
      return { success: false, error: RATE_LIMITED_MESSAGE };
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("dmca_notices")
      .insert({
        name: data.name,
        email: data.email,
        content_url: data.contentUrl,
        reason_code: data.reasonCode,
        description: data.description,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !row) {
      return { success: false, error: error?.message ?? "Could not save the report." };
    }

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("dmca-report", "support@onlookerlive.com", {
        templateData: {
          name: data.name,
          email: data.email,
          contentUrl: data.contentUrl,
          reasonCode: data.reasonCode,
          description: data.description,
          noticeId: row.id,
        },
        replyTo: data.email,
        idempotencyKey: `dmca-report-${row.id}`,
      });
    } catch (err) {
      // The report is safely stored — email delivery issues must not lose it.
      console.error("DMCA alert email failed", err);
    }

    return { success: true };
  });
