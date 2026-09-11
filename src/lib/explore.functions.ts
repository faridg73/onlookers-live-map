import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** One publicly shared clip, with short-lived playback links attached. */
export type ExploreClip = {
  id: string;
  title: string;
  place: string;
  note: string;
  bounty: number;
  createdAt: string;
  views: number;
  uploaderName: string;
  uploaderAvatar: string | null;
  comments: number;
  reviews: number;
  rating: number;
  videoUrl: string | null;
  thumbUrl: string | null;
};

export type ExploreComment = {
  id: string;
  body: string;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
};

const BUCKET = "bounty-videos";

/**
 * Public Explore feed. Clips live in a private bucket, so the server signs
 * short-lived playback links for anyone browsing — no sign-in required.
 */
export const listExploreClips = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z
      .object({ limit: z.number().int().min(1).max(30).default(12), offset: z.number().int().min(0).default(0) })
      .parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<ExploreClip[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("explore_clips", {
      _limit: data.limit,
      _offset: data.offset,
    });
    if (error || !rows) return [];

    return Promise.all(
      rows.map(async (r) => {
        const [video, thumb] = await Promise.all([
          supabaseAdmin.storage.from(BUCKET).createSignedUrl(r.storage_path, 60 * 60),
          r.thumb_path
            ? supabaseAdmin.storage.from(BUCKET).createSignedUrl(r.thumb_path, 60 * 60)
            : Promise.resolve({ data: null }),
        ]);
        return {
          id: r.id,
          title: r.request_title,
          place: r.request_place,
          note: r.note,
          bounty: Number(r.bounty_amount),
          createdAt: r.created_at,
          views: r.view_count,
          uploaderName: r.uploader_name,
          uploaderAvatar: r.uploader_avatar,
          comments: r.comment_count,
          reviews: r.review_count,
          rating: Number(r.average_rating),
          videoUrl: video.data?.signedUrl ?? null,
          thumbUrl: thumb.data?.signedUrl ?? null,
        };
      }),
    );
  });

/** Public comments for one clip, with the author's public name. */
export const listClipComments = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => z.object({ videoId: z.string().uuid() }).parse(data))
  .handler(async ({ data }): Promise<ExploreComment[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows } = await supabaseAdmin
      .from("video_comments")
      .select("id, body, created_at, user_id")
      .eq("video_id", data.videoId)
      .order("created_at", { ascending: false })
      .limit(50);
    if (!rows?.length) return [];

    const { data: people } = await supabaseAdmin
      .from("profiles")
      .select("id, display_name, avatar_url")
      .in("id", [...new Set(rows.map((r) => r.user_id))]);

    const byId = new Map((people ?? []).map((p) => [p.id, p]));
    return rows.map((r) => ({
      id: r.id,
      body: r.body,
      createdAt: r.created_at,
      authorName: byId.get(r.user_id)?.display_name ?? "onlooker",
      authorAvatar: byId.get(r.user_id)?.avatar_url ?? null,
    }));
  });
