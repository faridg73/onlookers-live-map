// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Short-lived links for profile photos. Photos stay visible to everyone, but
 * only files that are currently someone's profile photo can be linked — the
 * storage bucket itself is no longer readable by the public.
 */
export const signAvatarPaths = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ paths: z.array(z.string().min(3).max(300)).max(60) }).parse(data),
  )
  .handler(async ({ data }): Promise<Record<string, string>> => {
    const paths = [...new Set(data.paths)].filter((p) => !p.includes(".."));
    if (paths.length === 0) return {};
    const owners = [...new Set(paths.map((p) => p.split("/")[0] ?? "").filter(Boolean))];
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("id, avatar_url")
      .in("id", owners);
    const current = new Map((rows ?? []).map((r) => [r.id as string, (r.avatar_url as string | null) ?? ""]));
    const allowed = paths.filter((p) => current.get(p.split("/")[0]!)?.includes(p));
    if (allowed.length === 0) return {};
    const { data: signed } = await supabaseAdmin.storage.from("avatars").createSignedUrls(allowed, 60 * 60);
    const out: Record<string, string> = {};
    for (const s of signed ?? []) if (s.path && s.signedUrl) out[s.path] = s.signedUrl;
    return out;
  });
