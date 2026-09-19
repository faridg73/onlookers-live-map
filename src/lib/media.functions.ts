import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { attachSupabaseAuth } from "@/lib/auth-attacher";

/** Private buckets that accept member uploads, with their own size and type limits. */
export const MEDIA_BUCKETS = {
  "bounty-videos": {
    maxBytes: 500 * 1024 * 1024,
    allowed: ["video/", "image/"],
    label: "bounty clip",
  },
  "chat-attachments": {
    maxBytes: 200 * 1024 * 1024,
    allowed: ["video/", "image/"],
    label: "chat attachment",
  },
  posts: {
    maxBytes: 200 * 1024 * 1024,
    allowed: ["video/", "image/"],
    label: "post media",
  },
  "dispute-evidence": {
    maxBytes: 20 * 1024 * 1024,
    allowed: ["video/", "image/", "application/pdf"],
    label: "dispute evidence",
  },
} as const;

export type MediaBucket = keyof typeof MEDIA_BUCKETS;

const inputSchema = z.object({
  bucket: z.enum(["bounty-videos", "chat-attachments", "posts", "dispute-evidence"]),
  path: z.string().min(3).max(300),
  contentType: z.string().min(3).max(120),
  sizeBytes: z.number().int().positive(),
  upsert: z.boolean().optional(),
});

/**
 * Issues a short-lived presigned upload link so the browser sends the file
 * straight to storage instead of streaming it through the app server.
 * The path is always locked to the signed-in member's own folder.
 */
export const createMediaUploadUrl = createServerFn({ method: "POST" })
  .middleware([attachSupabaseAuth, requireSupabaseAuth])
  .inputValidator((input: z.input<typeof inputSchema>) => inputSchema.parse(input))
  .handler(
    async ({
      data,
      context,
    }): Promise<{ signedUrl?: string; token?: string; path?: string; error?: string }> => {
      const rules = MEDIA_BUCKETS[data.bucket as MediaBucket];
      const userId = context.userId;

      if (!data.path.startsWith(`${userId}/`) || data.path.includes("..")) {
        return { error: "That upload location is not allowed." };
      }
      if (!/^[A-Za-z0-9._/-]+$/.test(data.path)) {
        return { error: "That file name has characters we cannot store." };
      }
      if (!rules.allowed.some((prefix) => data.contentType.startsWith(prefix))) {
        return { error: "Only photos and video clips can be uploaded." };
      }
      if (data.sizeBytes > rules.maxBytes) {
        const mb = Math.round(rules.maxBytes / (1024 * 1024));
        return { error: `That ${rules.label} is larger than ${mb} MB.` };
      }

      try {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data: signed, error } = await supabaseAdmin.storage
          .from(data.bucket)
          .createSignedUploadUrl(data.path, { upsert: data.upsert ?? false });
        if (error || !signed) throw new Error(error?.message ?? "Could not prepare the upload.");

        return { signedUrl: signed.signedUrl, token: signed.token, path: signed.path };
      } catch (cause) {
        const message = cause instanceof Error ? cause.message : "Could not prepare the upload.";
        console.error("[media] signed upload url failed", {
          bucket: data.bucket,
          userId,
          message,
        });
        return { error: message };
      }
    },
  );
