import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const dmcaSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  contentUrl: z.string().trim().url({ message: "Enter a valid content URL" }).max(500),
  description: z
    .string()
    .trim()
    .min(20, { message: "Describe the infringing material (at least 20 characters)" })
    .max(3000),
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
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: row, error } = await supabaseAdmin
      .from("dmca_notices")
      .insert({
        name: data.name,
        email: data.email,
        content_url: data.contentUrl,
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
