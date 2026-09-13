import { playbackUrl, type BountyVideo } from "@/lib/bounty-videos";

const BRAND = "#CCFF00";
const BANNER_TEXT =
  "Live outside the stadium right now on Onlooker Live! Download the App to see views near you.";

function hashtag(value: string): string {
  const clean = value.replace(/[^a-zA-Z0-9 ]/g, "").replace(/\s+/g, "");
  return clean.length > 1 ? `#${clean}` : "";
}

/** Viral caption + hashtags derived from the request context. */
export function clipShareCaption(video: BountyVideo): string {
  const tags = ["#OnlookerLive", hashtag(video.request_place), hashtag(video.request_title), "#ConcertLogistics"]
    .filter(Boolean)
    .join(" ");
  return `${video.request_title} — ${video.request_place}\n${tags}`;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load the watermark logo."));
    img.src = src;
  });
}

function loadVideo(url: string): Promise<HTMLVideoElement> {
  return new Promise((resolve, reject) => {
    const video = document.createElement("video");
    video.crossOrigin = "anonymous";
    video.muted = false;
    video.playsInline = true;
    video.preload = "auto";
    video.onloadeddata = () => resolve(video);
    video.onerror = () => reject(new Error("Could not load your clip for sharing."));
    video.src = url;
  });
}

function pickMimeType(): string {
  const candidates = [
    "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
    "video/mp4",
    "video/webm;codecs=vp9,opus",
    "video/webm",
  ];
  return candidates.find((c) => MediaRecorder.isTypeSupported(c)) ?? "video/webm";
}

/**
 * Re-renders the clip through a canvas, burning in the Onlooker Live watermark
 * (top corner) and the viral banner (bottom), then returns a shareable File.
 */
export async function compileWatermarkedClip(
  video: BountyVideo,
  onProgress?: (label: string) => void,
): Promise<File> {
  onProgress?.("Loading your clip…");
  const url = await playbackUrl(video.storage_path);
  const [logo, source] = await Promise.all([loadImage("/icon-192.png"), loadVideo(url)]);

  const width = source.videoWidth || 720;
  const height = source.videoHeight || 1280;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't compile videos.");

  const canvasStream = canvas.captureStream(30);
  // Keep the original soundtrack when the browser exposes it.
  try {
    const withCapture = source as HTMLVideoElement & {
      captureStream?: () => MediaStream;
      mozCaptureStream?: () => MediaStream;
    };
    const sourceStream = withCapture.captureStream?.() ?? withCapture.mozCaptureStream?.();
    const audioTrack = sourceStream?.getAudioTracks()[0];
    if (audioTrack) canvasStream.addTrack(audioTrack);
  } catch {
    /* silent clip is fine */
  }

  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(canvasStream, { mimeType, videoBitsPerSecond: 6_000_000 });
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (e) => {
    if (e.data.size > 0) chunks.push(e.data);
  };
  const done = new Promise<Blob>((resolve, reject) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
    recorder.onerror = () => reject(new Error("Video compiling failed."));
  });

  const pad = Math.round(width * 0.035);
  const logoSize = Math.round(width * 0.11);
  const bannerHeight = Math.round(height * 0.14);
  const bannerPad = Math.round(width * 0.03);

  const drawFrame = () => {
    if (source.ended || source.paused) return;
    ctx.drawImage(source, 0, 0, width, height);

    // Top-corner watermark: logo chip + wordmark.
    ctx.save();
    ctx.globalAlpha = 0.92;
    ctx.fillStyle = "rgba(0,0,0,0.55)";
    const chipW = logoSize + Math.round(width * 0.19);
    const chipH = logoSize + pad * 0.9;
    const chipX = width - chipW - pad;
    const chipY = pad;
    ctx.beginPath();
    ctx.roundRect(chipX, chipY, chipW, chipH, chipH / 2.6);
    ctx.fill();
    ctx.drawImage(logo, chipX + pad * 0.45, chipY + pad * 0.45, logoSize, logoSize);
    ctx.fillStyle = BRAND;
    ctx.font = `800 ${Math.round(logoSize * 0.3)}px sans-serif`;
    ctx.textBaseline = "middle";
    ctx.fillText("ONLOOKER", chipX + logoSize + pad * 0.9, chipY + chipH * 0.34);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `700 ${Math.round(logoSize * 0.24)}px sans-serif`;
    ctx.fillText("LIVE", chipX + logoSize + pad * 0.9, chipY + chipH * 0.7);
    ctx.restore();

    // Bottom banner card.
    ctx.save();
    ctx.fillStyle = "rgba(10,10,10,0.88)";
    ctx.strokeStyle = BRAND;
    ctx.lineWidth = Math.max(2, Math.round(width * 0.004));
    const bx = bannerPad;
    const by = height - bannerHeight - bannerPad;
    const bw = width - bannerPad * 2;
    ctx.beginPath();
    ctx.roundRect(bx, by, bw, bannerHeight, Math.round(bannerHeight * 0.28));
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = BRAND;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const fontSize = Math.round(bannerHeight * 0.22);
    ctx.font = `800 ${fontSize}px sans-serif`;
    const mid = BANNER_TEXT.length / 2;
    const split = BANNER_TEXT.lastIndexOf("!", mid);
    const line1 = BANNER_TEXT.slice(0, split + 1);
    const line2 = BANNER_TEXT.slice(split + 1).trim();
    ctx.fillText(line1, width / 2, by + bannerHeight * 0.32);
    ctx.fillStyle = "#FFFFFF";
    ctx.font = `600 ${Math.round(fontSize * 0.92)}px sans-serif`;
    ctx.fillText(line2, width / 2, by + bannerHeight * 0.72);
    ctx.restore();

    requestAnimationFrame(drawFrame);
  };

  onProgress?.("Adding Onlooker Live branding…");
  recorder.start(250);
  await source.play();
  drawFrame();
  await new Promise<void>((resolve) => {
    source.onended = () => resolve();
  });
  recorder.stop();
  const blob = await done;

  const ext = mimeType.includes("mp4") ? "mp4" : "webm";
  return new File([blob], `onlooker-live-${video.id.slice(0, 8)}.${ext}`, { type: mimeType });
}

/**
 * Compile + open the native share sheet with the watermarked clip and viral
 * hashtags. Falls back to downloading the clip when file sharing is missing.
 */
export async function shareClipToSocials(
  video: BountyVideo,
  onProgress?: (label: string) => void,
): Promise<"shared" | "downloaded"> {
  const file = await compileWatermarkedClip(video, onProgress);
  const caption = clipShareCaption(video);

  onProgress?.("Opening share sheet…");
  if (navigator.canShare?.({ files: [file] })) {
    await navigator.share({ files: [file], text: caption, title: "Onlooker Live" });
    return "shared";
  }

  // Fallback: save the watermarked clip so it can be posted manually.
  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  return "downloaded";
}
