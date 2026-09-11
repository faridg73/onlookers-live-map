import { supabase } from "@/integrations/supabase/client";
import {
  listClipComments,
  listExploreClips,
  type ExploreClip,
  type ExploreComment,
} from "@/lib/explore.functions";

export type { ExploreClip, ExploreComment };

export function fetchExploreClips(limit = 12, offset = 0) {
  return listExploreClips({ data: { limit, offset } });
}

export function fetchClipComments(videoId: string) {
  return listClipComments({ data: { videoId } });
}

/** Bumps the public view counter; safe for signed-out visitors. */
export async function countClipView(videoId: string): Promise<number | null> {
  const { data, error } = await supabase.rpc("increment_clip_views", { _video_id: videoId });
  return error ? null : Number(data ?? 0);
}

export async function postClipComment(videoId: string, body: string) {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sign in to leave a comment.");
  const { error } = await supabase
    .from("video_comments")
    .insert({ video_id: videoId, user_id: userId, body: body.trim() });
  if (error) throw new Error(error.message);
}

/** One review per person per clip — posting again updates the old score. */
export async function rateClip(videoId: string, score: number, note = "") {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sign in to leave a review.");
  const { error } = await supabase
    .from("video_reviews")
    .upsert({ video_id: videoId, user_id: userId, score, note }, { onConflict: "video_id,user_id" });
  if (error) throw new Error(error.message);
}
