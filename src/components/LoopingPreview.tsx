// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useRef, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";

const VIDEO_EXTENSIONS = /\.(mp4|webm|mov|m4v)(\?|$)/i;

/** True when a stored media URL points at a video file rather than a photo. */
export function looksLikeVideo(url?: string | null) {
  return Boolean(url && VIDEO_EXTENSIONS.test(url));
}

/**
 * Card cover that comes alive: a muted looping clip while the card is on
 * screen, a slow drifting photo when there is only a still, and an animated
 * gradient placeholder when a lane has no media of its own yet.
 */
export function LoopingPreview({
  videoUrl,
  imageUrl,
  alt,
  icon: Icon,
  coverClass,
  className,
  rounded,
  previewDuration = 4,
}: {
  /** Looping clip source — plays muted while visible. */
  videoUrl?: string | null | undefined;
  /** Still image; used as the poster when a clip is present. */
  imageUrl?: string | null | undefined;
  alt: string;
  icon?: ComponentType<{ className?: string; strokeWidth?: number }>;
  /** Gradient utility class used when there is no real media. */
  coverClass?: string;
  className?: string;
  rounded?: string;
  /** Length of the silent micro-preview loop, in seconds. */
  previewDuration?: number;
}) {
  const holder = useRef<HTMLDivElement | null>(null);
  const video = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = holder.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => setVisible(entries.some((e) => e.isIntersecting)),
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const node = video.current;
    if (!node) return;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (visible && !reduced) {
      node.currentTime = 0;
      void node.play().catch(() => {});
    } else {
      node.pause();
    }
  }, [visible, videoUrl]);

  useEffect(() => {
    const node = video.current;
    if (!node) return;
    const loopPreview = () => {
      const loopAt = Number.isFinite(node.duration)
        ? Math.min(previewDuration, node.duration)
        : previewDuration;
      if (node.currentTime < loopAt) return;
      node.currentTime = 0;
      if (visible) void node.play().catch(() => {});
    };
    node.addEventListener("timeupdate", loopPreview);
    node.addEventListener("ended", loopPreview);
    return () => {
      node.removeEventListener("timeupdate", loopPreview);
      node.removeEventListener("ended", loopPreview);
    };
  }, [previewDuration, visible, videoUrl]);

  const hasVideo = Boolean(videoUrl);
  const hasImage = Boolean(imageUrl);

  return (
    <div
      ref={holder}
      className={cn(
        "relative size-full overflow-hidden",
        !hasVideo && !hasImage && coverClass,
        rounded,
        className,
      )}
    >
      {hasVideo && (
        <video
          ref={video}
          src={videoUrl ?? undefined}
          {...(imageUrl ? { poster: imageUrl } : {})}
          muted
          playsInline
          preload="metadata"
          aria-label={alt}
          className="size-full object-cover"
        />
      )}

      {!hasVideo && hasImage && (
        <img
          src={imageUrl ?? undefined}
          alt={alt}
          loading="lazy"
          className="size-full animate-slow-pan object-cover motion-reduce:animate-none"
        />
      )}

      {!hasVideo && !hasImage && (
        <>
          <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
            {Icon && (
              <Icon
                className="size-16 animate-pulse text-foreground/25 motion-reduce:animate-none"
                strokeWidth={1.3}
              />
            )}
          </div>
          <span
            className="pointer-events-none absolute inset-y-0 -left-full w-1/2 animate-shimmer bg-gradient-to-r from-transparent via-foreground/10 to-transparent motion-reduce:animate-none"
            aria-hidden
          />
        </>
      )}

      {hasVideo && (
        <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-md bg-background/75 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase tracking-[0.1em] text-foreground backdrop-blur">
          <span className="size-1.5 animate-pulse rounded-full bg-live motion-reduce:animate-none" />
          Preview
        </span>
      )}
    </div>
  );
}
