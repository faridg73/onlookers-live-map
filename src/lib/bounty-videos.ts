import { supabase } from "@/integrations/supabase/client";
import type { LiveRequest } from "@/lib/onlooker";

export const BOUNTY_VIDEO_BUCKET = "bounty-videos";

export type BountyVideo = {
  id: string;
  request_id: string;
  uploader_id: string;
  request_title: string;
  request_place: string;
  bounty_amount: number;
  note: string;
  storage_path: string;
  duration_seconds: number | null;
  created_at: string;
};

function extensionFor(file: File) {
  const fromName = file.name.includes(".") ? file.name.split(".").pop() : null;
  if (fromName && fromName.length <= 5) return fromName.toLowerCase();
  if (file.type.includes("quicktime")) return "mov";
  if (file.type.includes("webm")) return "webm";
  return "mp4";
}

/** Upload a fulfilment video to storage and save the record against the bounty. */
export async function uploadBountyVideo({
  file,
  request,
  note,
  durationSeconds,
}: {
  file: File;
  request: LiveRequest;
  note?: string;
  durationSeconds?: number | null;
}): Promise<BountyVideo> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Sign in to upload a bounty video.");

  const path = `${user.id}/${request.id}/${Date.now()}.${extensionFor(file)}`;

  const { error: uploadError } = await supabase.storage
    .from(BOUNTY_VIDEO_BUCKET)
    .upload(path, file, {
      contentType: file.type || "video/mp4",
      cacheControl: "3600",
      upsert: false,
    });
  if (uploadError) throw uploadError;

  const { data, error } = await supabase
    .from("bounty_videos")
    .insert({
      request_id: request.id,
      uploader_id: user.id,
      request_title: request.title,
      request_place: request.place,
      bounty_amount: request.bounty,
      note: note ?? "",
      storage_path: path,
      duration_seconds: durationSeconds ?? null,
    })
    .select()
    .single();

  if (error) {
    // Don't leave an orphan file behind if the record failed to save.
    await supabase.storage.from(BOUNTY_VIDEO_BUCKET).remove([path]);
    throw error;
  }

  return data as BountyVideo;
}

export async function listVideosForRequest(requestId: string) {
  const { data, error } = await supabase
    .from("bounty_videos")
    .select("*")
    .eq("request_id", requestId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BountyVideo[];
}

export async function listMyVideos() {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("bounty_videos")
    .select("*")
    .eq("uploader_id", auth.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as BountyVideo[];
}

/** Short-lived playback link for a stored video (files themselves are kept indefinitely). */
export async function playbackUrl(storagePath: string, expiresInSeconds = 60 * 60) {
  const { data, error } = await supabase.storage
    .from(BOUNTY_VIDEO_BUCKET)
    .createSignedUrl(storagePath, expiresInSeconds);
  if (error) throw error;
  return data.signedUrl;
}

export async function deleteBountyVideo(video: BountyVideo) {
  const { error } = await supabase.from("bounty_videos").delete().eq("id", video.id);
  if (error) throw error;
  await supabase.storage.from(BOUNTY_VIDEO_BUCKET).remove([video.storage_path]);
}
