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
  thumb_path: string | null;
  duration_seconds: number | null;
  created_at: string;
  accepted_at: string | null;
  accepted_by: string | null;
  payout_amount: number;
};

/** Accept a clip: pays the reporter their bounty (minus the 15% app fee). */
export async function acceptBountyVideo(videoId: string): Promise<number> {
  const { data, error } = await supabase.rpc("accept_bounty_video", { _video_id: videoId });
  if (error) throw error;
  return Number(data ?? 0);
}

/** Grab a still frame from a video file in the browser and return it as a JPEG. */
async function captureThumbnail(file: File): Promise<Blob | null> {
  if (typeof document === "undefined") return null;
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.preload = "metadata";

    await new Promise<void>((resolve, reject) => {
      const fail = () => reject(new Error("thumbnail"));
      video.onloadeddata = () => resolve();
      video.onerror = fail;
      setTimeout(fail, 8000);
    });

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
      video.currentTime = Math.min(1, (video.duration || 1) / 3);
      setTimeout(resolve, 3000);
    });

    const width = video.videoWidth || 640;
    const height = video.videoHeight || 360;
    const scale = Math.min(1, 640 / width);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return await new Promise((resolve) =>
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.8),
    );
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

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

  let thumbPath: string | null = null;
  const thumb = await captureThumbnail(file);
  if (thumb) {
    const candidate = `${path.replace(/\.[^.]+$/, "")}-thumb.jpg`;
    const { error: thumbError } = await supabase.storage
      .from(BOUNTY_VIDEO_BUCKET)
      .upload(candidate, thumb, { contentType: "image/jpeg", cacheControl: "3600", upsert: true });
    if (!thumbError) thumbPath = candidate;
  }

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
      thumb_path: thumbPath,
      duration_seconds: durationSeconds ?? null,
    })
    .select()
    .single();

  if (error) {
    // Don't leave an orphan file behind if the record failed to save.
    await supabase.storage
      .from(BOUNTY_VIDEO_BUCKET)
      .remove(thumbPath ? [path, thumbPath] : [path]);
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
  await supabase.storage
    .from(BOUNTY_VIDEO_BUCKET)
    .remove(video.thumb_path ? [video.storage_path, video.thumb_path] : [video.storage_path]);
}

/** Signed preview image URLs keyed by video id, for the videos that have a thumbnail. */
export async function thumbnailUrls(videos: BountyVideo[], expiresInSeconds = 60 * 60) {
  const withThumbs = videos.filter((v): v is BountyVideo & { thumb_path: string } =>
    Boolean(v.thumb_path),
  );
  if (withThumbs.length === 0) return {} as Record<string, string>;

  const { data, error } = await supabase.storage
    .from(BOUNTY_VIDEO_BUCKET)
    .createSignedUrls(
      withThumbs.map((v) => v.thumb_path),
      expiresInSeconds,
    );
  if (error || !data) return {} as Record<string, string>;

  const map: Record<string, string> = {};
  data.forEach((entry, i) => {
    const video = withThumbs[i];
    if (video && entry.signedUrl) map[video.id] = entry.signedUrl;
  });
  return map;
}
