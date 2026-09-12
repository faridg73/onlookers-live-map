export const MAX_CLIP_SECONDS = 60;

/** Reads how long a video file runs, in seconds. */
export async function videoDuration(file: File): Promise<number> {
  if (typeof document === "undefined") return 0;
  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = url;
    return await new Promise<number>((resolve) => {
      const done = () => resolve(Number.isFinite(video.duration) ? video.duration : 0);
      video.onloadedmetadata = done;
      video.onerror = () => resolve(0);
      setTimeout(done, 6000);
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const options = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm", "video/mp4"];
  return options.find((type) => MediaRecorder.isTypeSupported(type));
}

/**
 * Shrinks a chat clip by replaying it into a smaller canvas and re-encoding at a
 * modest bitrate, so messages stay fast to send and cheap to store. Falls back
 * to the original file whenever the browser can't do it.
 */
export async function compressVideo(
  file: File,
  { maxWidth = 720, bitsPerSecond = 900_000 } = {},
): Promise<File> {
  if (typeof document === "undefined" || typeof MediaRecorder === "undefined") return file;
  const mimeType = pickMimeType();
  if (!mimeType) return file;
  // Small clips aren't worth the extra work.
  if (file.size < 2 * 1024 * 1024) return file;

  const url = URL.createObjectURL(file);
  try {
    const video = document.createElement("video");
    video.src = url;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("unreadable"));
      setTimeout(() => reject(new Error("timeout")), 8000);
    });

    const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(2, Math.round((video.videoWidth || maxWidth) * scale));
    canvas.height = Math.max(2, Math.round((video.videoHeight || maxWidth) * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    const stream = canvas.captureStream(24);
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    const finished = new Promise<Blob>((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    });

    recorder.start(500);
    await video.play().catch(() => undefined);

    let frame = 0;
    const draw = () => {
      if (video.ended || video.paused) return;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      frame = requestAnimationFrame(draw);
    };
    draw();

    await new Promise<void>((resolve) => {
      video.onended = () => resolve();
      // Never spend longer than the clip cap on a single compression pass.
      setTimeout(resolve, (MAX_CLIP_SECONDS + 5) * 1000);
    });
    cancelAnimationFrame(frame);
    if (recorder.state !== "inactive") recorder.stop();

    const blob = await finished;
    if (blob.size === 0 || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^.]+$/, "") || "clip";
    return new File([blob], `${name}-compressed.webm`, { type: blob.type });
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}
