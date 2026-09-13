import { supabase } from "@/integrations/supabase/client";
import { createMediaUploadUrl, type MediaBucket } from "@/lib/media.functions";

/**
 * Sends a photo or clip straight from the device to private cloud storage
 * using a short-lived presigned link, so heavy media never passes through the
 * app server. Falls back to a signed-in storage upload if the link fails.
 */
export async function uploadMedia({
  bucket,
  path,
  file,
  contentType,
  upsert = false,
  cacheControl = "3600",
}: {
  bucket: MediaBucket;
  path: string;
  file: Blob;
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
}): Promise<string> {
  const type = contentType || file.type || "application/octet-stream";

  const signed = await createMediaUploadUrl({
    data: { bucket, path, contentType: type, sizeBytes: file.size, upsert },
  });
  if (signed.error) throw new Error(signed.error);

  if (signed.token) {
    const { error } = await supabase.storage
      .from(bucket)
      .uploadToSignedUrl(path, signed.token, file, { contentType: type, upsert });
    if (!error) return path;
    // A stale or already-used link should not lose the capture — retry directly.
    console.warn("[media] presigned upload failed, retrying directly", error.message);
  }

  const { error: directError } = await supabase.storage
    .from(bucket)
    .upload(path, file, { contentType: type, cacheControl, upsert });
  if (directError) throw directError;
  return path;
}
