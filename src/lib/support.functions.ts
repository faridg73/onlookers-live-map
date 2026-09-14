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

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true, id: row?.id };
  });
