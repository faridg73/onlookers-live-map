// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { MEDIA_BUCKETS, type MediaBucket } from "@/lib/media.functions";

/** Biggest clip storage will take, in whole megabytes. */
export function maxMegabytesFor(bucket: MediaBucket) {
  return Math.round(MEDIA_BUCKETS[bucket].maxBytes / (1024 * 1024));
}

export function megabytes(bytes: number) {
  return Math.max(1, Math.round(bytes / (1024 * 1024)));
}

/** Local clock time, e.g. "7:42 PM". */
export function clockTime(iso: string | null | undefined) {
  if (!iso) return "";
  const at = new Date(iso);
  if (!Number.isFinite(at.getTime())) return "";
  return at.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

/** True when the browser knows it has no connection at all. */
export function isOffline() {
  return typeof navigator !== "undefined" && navigator.onLine === false;
}

function lower(value: unknown) {
  return (value instanceof Error ? value.message : String(value ?? "")).toLowerCase();
}

/**
 * Turns any upload or submission failure into a sentence that says what went
 * wrong and what to do next. Never returns a bare "something went wrong".
 */
export function describeUploadError(
  error: unknown,
  options: { bucket?: MediaBucket; sizeBytes?: number; windowEndsAt?: string | null } = {},
): string {
  const bucket = options.bucket ?? "bounty-videos";
  const limit = maxMegabytesFor(bucket);
  const text = lower(error);
  const raw = error instanceof Error ? error.message.trim() : "";

  if (isOffline()) {
    return "Connection lost — you're offline. Reconnect to Wi-Fi or mobile data and tap Retry; your clip is still here.";
  }

  if (
    text.includes("too large") ||
    text.includes("larger than") ||
    text.includes("exceeded the maximum") ||
    text.includes("payload too large") ||
    text.includes("413")
  ) {
    const size = options.sizeBytes ? ` (yours is about ${megabytes(options.sizeBytes)} MB)` : "";
    return `Upload failed: file too large${size}. The most we can take is ${limit} MB — film a shorter clip and send it again.`;
  }

  if (
    text.includes("failed to fetch") ||
    text.includes("network") ||
    text.includes("load failed") ||
    text.includes("timeout") ||
    text.includes("timed out") ||
    text.includes("connection")
  ) {
    return "Connection dropped mid-upload and the automatic retries didn't get through. Move somewhere with better signal and tap Retry — nothing was lost.";
  }

  if (
    text.includes("jwt") ||
    text.includes("unauthorized") ||
    text.includes("no authorization header") ||
    text.includes("sign in") ||
    text.includes("401")
  ) {
    return "Your sign-in expired while filming. Sign in again and send the same clip — your claim on this bounty is kept for a few minutes.";
  }

  if (text.includes("not the onlooker working this bounty")) {
    const at = clockTime(options.windowEndsAt);
    return at
      ? `Submission window expired at ${at} and the bounty went back on the map. Claim it again, or use the support link if you uploaded before then.`
      : "Submission window expired and the bounty went back on the map. Claim it again, or use the support link if you uploaded before then.";
  }

  if (text.includes("review window") || text.includes("no longer") || text.includes("closed")) {
    const at = clockTime(options.windowEndsAt);
    return at
      ? `Submission window expired at ${at}. Use the support link below if your upload started before then.`
      : "This bounty's submission window has closed. Use the support link below if your upload started before then.";
  }

  if (text.includes("only photos and video")) {
    return "Upload failed: that file isn't a photo or video. Film it with the camera button and send again.";
  }

  if (text.includes("row-level security") || text.includes("permission")) {
    return "This bounty won't accept your clip — it looks like the claim moved to someone else. Refresh the bounty, or use the support link below.";
  }

  if (raw) return `Upload failed: ${raw}`;
  return `Upload failed before the clip reached us. Tap Retry — if it fails again, use the "Submission failed? Contact support" link.`;
}
