import { sanitizeText } from "@/lib/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media-upload";
import type { LiveRequest } from "@/lib/onlooker";
import type { ModerationReasonCode } from "@/lib/moderation-reasons";

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
  view_count: number;
  is_public: boolean;
  is_instant: boolean;
  expired_at: string | null;
};

/** Accept a clip: pays the reporter their bounty (minus the 15% app fee). */
export async function acceptBountyVideo(videoId: string): Promise<number> {
  const { data, error } = await supabase.rpc("accept_bounty_video", { _video_id: videoId });
  if (error) throw error;
  return Number(data ?? 0);
}

/**
 * Requester flags a submitted clip within the review window. The money stays
 * locked in escrow until a moderator resolves it.
 */
export async function disputeBountyVideo(
  requestId: string,
  reason: string,
  reasonCode: ModerationReasonCode,
): Promise<void> {
  const { error } = await supabase.rpc("dispute_bounty", {
    _request_id: requestId,
    _reason: reason,
    _reason_code: reasonCode,
  });
  if (error) throw error;
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
  return extensionForType(file.type);
}

/** File extension that actually matches the recorded container. */
function extensionForType(mime: string) {
  if (mime.includes("webm")) return "webm";
  if (mime.includes("quicktime") || mime.includes("mov")) return "mov";
  if (mime.includes("ogg")) return "ogv";
  return "mp4";
}

/**
 * Browsers (Chrome especially) refuse to play a file served as
 * `video/quicktime`, even though phone captures are H.264/AAC that every
 * player handles. Store those as `video/mp4` so playback works everywhere.
 */
function playableContentType(mime: string) {
  if (!mime) return "video/mp4";
  if (mime.includes("quicktime") || mime.includes("mov") || mime.includes("x-m4v")) {
    return "video/mp4";
  }
  return mime;
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

  await uploadMedia({
    bucket: BOUNTY_VIDEO_BUCKET,
    path,
    file,
    contentType: playableContentType(file.type),
  });

  let thumbPath: string | null = null;
  const thumb = await captureThumbnail(file);
  if (thumb) {
    const candidate = `${path.replace(/\.[^.]+$/, "")}-thumb.jpg`;
    try {
      await uploadMedia({
        bucket: BOUNTY_VIDEO_BUCKET,
        path: candidate,
        file: thumb,
        contentType: "image/jpeg",
        upsert: true,
      });
      thumbPath = candidate;
    } catch {
      thumbPath = null;
    }
  }

  const { data, error } = await supabase
    .from("bounty_videos")
    .insert({
      // Save against the stored request when there is one, so escrow release
      // and the bounty chat thread line up for both people.
      request_id: request.dbId ?? request.id,
      uploader_id: user.id,
      request_title: request.title,
      request_place: request.place,
      bounty_amount: request.bounty,
      note: sanitizeText(note ?? "", { multiline: true, maxLength: 1000 }),
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

export async function listVideosForRequest(requestId: string, dbId?: string | null) {
  const keys = dbId ? [requestId, dbId] : [requestId];
  const { data, error } = await supabase
    .from("bounty_videos")
    .select("*")
    .in("request_id", keys)
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

/**
 * Saves a finished live broadcast recording so the creator can replay it from
 * their profile. Works for both paid flash streams (a real request id) and free
 * broadcasts (a local key the escrow triggers safely ignore).
 */
export async function saveBroadcastRecording({
  blob,
  seconds,
  requestId,
  title,
  place,
  bounty = 0,
  note = "",
}: {
  blob: Blob;
  seconds: number;
  requestId: string;
  title: string;
  place: string;
  bounty?: number;
  note?: string;
}): Promise<BountyVideo> {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth.user;
  if (!user) throw new Error("Sign in to save your broadcast.");

  // Phone captures arrive as QuickTime; keep the name, extension and stored
  // content type in sync so the clip plays back in every browser.
  const sourceType = (blob as File).type || "";
  const extension = extensionForType(sourceType);
  const contentType = playableContentType(sourceType);
  const file = new File([blob], `broadcast-${Date.now()}.${extension}`, {
    type: contentType,
  });
  const path = `${user.id}/${requestId}/${Date.now()}.${extension}`;

  await uploadMedia({
    bucket: BOUNTY_VIDEO_BUCKET,
    path,
    file,
    contentType,
  });

  let thumbPath: string | null = null;
  const thumb = await captureThumbnail(file);
  if (thumb) {
    const candidate = `${path.replace(/\.[^.]+$/, "")}-thumb.jpg`;
    try {
      await uploadMedia({
        bucket: BOUNTY_VIDEO_BUCKET,
        path: candidate,
        file: thumb,
        contentType: "image/jpeg",
        upsert: true,
      });
      thumbPath = candidate;
    } catch {
      thumbPath = null;
    }
  }

  const { data, error } = await supabase
    .from("bounty_videos")
    .insert({
      request_id: requestId,
      uploader_id: user.id,
      request_title: title,
      request_place: place,
      bounty_amount: bounty,
      note: sanitizeText(note, { multiline: true, maxLength: 1000 }),
      storage_path: path,
      thumb_path: thumbPath,
      duration_seconds: Math.max(1, Math.round(seconds)),
    })
    .select()
    .single();

  if (error) {
    await supabase.storage
      .from(BOUNTY_VIDEO_BUCKET)
      .remove(thumbPath ? [path, thumbPath] : [path]);
    throw error;
  }
  return data as BountyVideo;
}
