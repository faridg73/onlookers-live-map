import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { RATE_LIMITED_MESSAGE, RATE_LIMITS, withinRateLimit } from "@/lib/rate-limit.server";
import { safeMultiline, safeText } from "@/lib/sanitize";

const ticketSchema = z.object({
  name: safeText(100, 1),
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  subject: safeText(200, 1),
  message: safeMultiline(2000, 10),
});

export type SupportTicketInput = z.infer<typeof ticketSchema>;

/**
 * Submit a Contact / Support message. The ticket is stored in the database
 * and associated with the signed-in user when a session is present.
 */
export const submitSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ticketSchema.parse(data))
  .handler(async ({ data }): Promise<{ success: boolean; id?: string; error?: string }> => {
    if (!(await withinRateLimit(RATE_LIMITS.support))) {
      return { success: false, error: RATE_LIMITED_MESSAGE };
    }
    const [{ supabase }, { supabaseAdmin }] = await Promise.all([
      import("@/integrations/supabase/client"),
      import("@/integrations/supabase/client.server"),
    ]);

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const userId = session?.user?.id ?? null;

    const { data: row, error } = await supabaseAdmin
      .from("support_tickets")
      .insert({
        user_id: userId,
        name: data.name,
        email: data.email,
        subject: data.subject,
        message: data.message,
        status: "open",
      })
      .select("id")
      .single();

    if (error || !row) {
      return { success: false, error: error?.message ?? "Could not save your message." };
    }

    // Alert the support inbox. The ticket is already stored, so a delivery
    // failure must never lose the message — it is logged, not thrown.
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("support-ticket", "support@onlookerlive.com", {
        templateData: {
          name: data.name,
          email: data.email,
          subject: data.subject,
          message: data.message,
          ticketId: row.id,
          userId: userId ?? "not signed in",
        },
        replyTo: data.email,
        idempotencyKey: `support-ticket-${row.id}`,
      });
    } catch (err) {
      console.error("Support ticket alert email failed", err);
    }

    // Confirmation copy to the person who wrote in.
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      await sendTemplateEmail("support-received", data.email, {
        templateData: {
          name: data.name,
          subject: data.subject,
          message: data.message,
          ticketId: row.id,
        },
        replyTo: "support@onlookerlive.com",
        idempotencyKey: `support-received-${row.id}`,
      });
    } catch (err) {
      console.error("Support confirmation email failed", err);
    }

    return { success: true, id: row.id };
  });
