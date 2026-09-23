// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { createMediaUploadUrl, MEDIA_BUCKETS, type MediaBucket } from "@/lib/media.functions";
import { megabytes, maxMegabytesFor } from "@/lib/upload-errors";

/** How many times a dropped connection is retried before we give up. */
const MAX_ATTEMPTS = 3;

export type UploadStatus =
  | { phase: "preparing"; message: string }
  | { phase: "uploading"; message: string; attempt: number }
  | { phase: "retrying"; message: string; attempt: number }
  | { phase: "saving"; message: string }
  | { phase: "done"; message: string };

function retryable(message: string) {
  const text = message.toLowerCase();
  return (
    text.includes("failed to fetch") ||
    text.includes("network") ||
    text.includes("load failed") ||
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("connection") ||
    text.includes("502") ||
    text.includes("503") ||
    text.includes("504")
  );
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Sends a photo or clip straight from the device to private cloud storage
 * using a short-lived presigned link, so heavy media never passes through the
 * app server. Dropped connections are retried automatically, and every failure
 * surfaces a specific reason instead of a generic error.
 */
export async function uploadMedia({
  bucket,
  path,
  file,
  contentType,
  upsert = false,
  cacheControl = "3600",
  onStatus,
}: {
  bucket: MediaBucket;
  path: string;
  file: Blob;
  contentType?: string;
  upsert?: boolean;
  cacheControl?: string;
  onStatus?: (status: UploadStatus) => void;
}): Promise<string> {
  const type = contentType || file.type || "application/octet-stream";

  // Caught here so the person sees the size rule before a long upload fails.
  if (file.size > MEDIA_BUCKETS[bucket].maxBytes) {
    throw new Error(
      `file too large (about ${megabytes(file.size)} MB). The most we can take is ${maxMegabytesFor(bucket)} MB.`,
    );
  }

  onStatus?.({ phase: "preparing", message: "Getting a secure upload link…" });

  const signed = await createMediaUploadUrl({
    data: { bucket, path, contentType: type, sizeBytes: file.size, upsert },
  });
  if (signed.error) throw new Error(signed.error);

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    onStatus?.(
      attempt === 1
        ? { phase: "uploading", message: "Uploading your clip…", attempt }
        : {
            phase: "retrying",
            message: `Connection lost — retrying automatically (try ${attempt} of ${MAX_ATTEMPTS})…`,
            attempt,
          },
    );

    try {
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
      if (!directError) return path;
      throw directError;
    } catch (cause) {
      lastError = cause instanceof Error ? cause : new Error(String(cause));
      const offline = typeof navigator !== "undefined" && navigator.onLine === false;
      if (attempt >= MAX_ATTEMPTS || !(offline || retryable(lastError.message))) break;
      await wait(attempt * 1500);
    }
  }

  throw lastError ?? new Error("The upload did not reach storage.");
}
