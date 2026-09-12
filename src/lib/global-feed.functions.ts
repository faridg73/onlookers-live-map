import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/** A completed, already-paid clip anyone can watch from the Global Feed map. */
export type GlobalClip = {
  id: string;
  title: string;
  place: string;
  note: string;
  bounty: number;
  createdAt: string;
  views: number;
  uploaderName: string;
  uploaderAvatar: string | null;
  hunterLevel: number;
  tipTotal: number;
  latitude: number | null;
  longitude: number | null;
  videoUrl: string | null;
  thumbUrl: string | null;
};

const BUCKET = "bounty-videos";

/**
 * Public worldwide feed of unlocked clips. Files live in a private bucket, so
 * the server signs short-lived playback links for any visitor.
 */
export const listGlobalClips = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ limit: z.number().int().min(1).max(60).default(30) }).parse(data ?? {}),
  )
  .handler(async ({ data }): Promise<GlobalClip[]> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin.rpc("global_feed_clips", {
      _limit: data.limit,
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
          hunterLevel: r.hunter_level ?? 1,
          tipTotal: Number(r.tip_total ?? 0),
          latitude: r.latitude ?? null,
          longitude: r.longitude ?? null,
          videoUrl: video.data?.signedUrl ?? null,
          thumbUrl: thumb.data?.signedUrl ?? null,
        };
      }),
    );
  });
