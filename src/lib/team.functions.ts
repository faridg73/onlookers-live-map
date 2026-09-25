// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

/** Owner adds someone to their team roster and we email them the invite. */
export const inviteTeamMember = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ email: z.string().trim().toLowerCase().email().max(254), memberType: z.enum(["staff", "hunter"]) }).parse(input),
  )
  .handler(async ({ data, context }): Promise<{ ok: true; emailed: boolean } | { error: string }> => {
    // Runs as the owner: the database checks the Team plan and ownership.
    const { data: memberId, error } = await context.supabase.rpc("team_invite", {
      _email: data.email,
      _member_type: data.memberType,
    });
    if (error || !memberId) return { error: error?.message ?? "Could not add that person." };

    const [{ data: team }, { data: profile }] = await Promise.all([
      context.supabase.from("pro_teams").select("name").eq("owner_id", context.userId).maybeSingle(),
      context.supabase.from("profiles").select("display_name, full_name").eq("id", context.userId).maybeSingle(),
    ]);

    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const result = await sendTemplateEmail("team-invite", data.email, {
        templateData: {
          teamName: team?.name || "",
          inviterName: profile?.full_name || profile?.display_name || "",
          memberType: data.memberType,
          email: data.email,
          joinUrl: "https://onlooker.io/pro-dashboard",
        },
        idempotencyKey: `team-invite-${memberId}`,
      });
      return { ok: true, emailed: result.sent };
    } catch (e) {
      console.error("team invite email failed", e);
      return { ok: true, emailed: false };
    }
  });
