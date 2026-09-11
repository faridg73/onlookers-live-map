import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const ticketSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(100),
  email: z.string().trim().email({ message: "Enter a valid email address" }).max(255),
  subject: z.string().trim().min(1, { message: "Subject is required" }).max(200),
  message: z.string().trim().min(10, { message: "Message must be at least 10 characters" }).max(2000),
});

export type SupportTicketInput = z.infer<typeof ticketSchema>;

/**
 * Submit a Contact / Support message. The ticket is stored in the database
 * and associated with the signed-in user when a session is present.
 */
export const submitSupportTicket = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => ticketSchema.parse(data))
  .handler(async ({ data }): Promise<{ success: boolean; id?: string; error?: string }> => {
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
