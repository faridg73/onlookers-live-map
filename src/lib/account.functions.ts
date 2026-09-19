import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ confirmation: z.literal("DELETE") }).parse(input),
  )
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: files, error: listError } = await supabaseAdmin.storage
      .from("avatars")
      .list(context.userId);
    if (listError) throw new Error("Could not remove your profile photo. Please try again.");
    const paths = (files ?? []).map((file) => `${context.userId}/${file.name}`);
    if (paths.length > 0) {
      const { error: removeError } = await supabaseAdmin.storage.from("avatars").remove(paths);
      if (removeError) throw new Error("Could not remove your profile photo. Please try again.");
    }

    const { error: unlinkError } = await supabaseAdmin
      .from("bounty_videos")
      .update({ accepted_by: null })
      .eq("accepted_by", context.userId);
    if (unlinkError) throw new Error("Could not prepare your account for deletion. Please try again.");

    const { error } = await supabaseAdmin.auth.admin.deleteUser(context.userId);
    if (error) throw new Error("Could not delete your account. Please try again.");
    return { deleted: true };
  });