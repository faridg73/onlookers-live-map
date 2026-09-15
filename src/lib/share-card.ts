import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const SITE_URL = "https://onlookerlive.com";
const BRAND = "#CCFF00";

/** Anything worth bragging about: a finished bounty, a discovery, a flash meetup. */
export type ShareArtifact = {
  kind: "bounty" | "discovery" | "meetup" | "pool";
  title: string;
  place: string;
  /** Credits headline, e.g. an earned payout or a pooled total. */
  credits?: number;
  /** Optional still to use as the card background (must be CORS-readable). */
  imageUrl?: string;
  /** Small line under the headline. */
  note?: string;
};

const KIND_LABEL: Record<ShareArtifact["kind"], string> = {
  bounty: "BOUNTY COMPLETED",
  discovery: "LOCAL DISCOVERY",
  meetup: "FLASH MEETUP",
  pool: "GROUP POOL",
};

/** Personal invite link so every share brings people back to the app. */
export async function referralLink(): Promise<string> {
  const { data } = await supabase.auth.getUser();
  const code = data.user?.id.slice(0, 8);
  return code ? `${SITE_URL}/?ref=${code}` : SITE_URL;
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image failed"));
    img.src = src;
  });
}

function wrap(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, max = 3): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
      if (lines.length === max) return lines;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Draws the stylised share card and returns it as a PNG file. */
export async function buildShareCard(artifact: ShareArtifact): Promise<File> {
  const width = 1080;
  const height = 1350;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("This browser can't build share cards.");

  ctx.fillStyle = "#000000";
  ctx.fillRect(0, 0, width, height);

  if (artifact.imageUrl) {
    try {
      const img = await loadImage(artifact.imageUrl);
      const scale = Math.max(width / img.width, height / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.globalAlpha = 0.75;
      ctx.drawImage(img, (width - w) / 2, (height - h) / 2, w, h);
      ctx.globalAlpha = 1;
      const grad = ctx.createLinearGradient(0, height * 0.25, 0, height);
      grad.addColorStop(0, "rgba(0,0,0,0.15)");
      grad.addColorStop(1, "rgba(0,0,0,0.95)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    } catch {
      /* plain black card is fine */
    }
  }

  // Neon frame
  ctx.strokeStyle = BRAND;
  ctx.lineWidth = 8;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  const pad = 96;

  // Kind chip
  ctx.fillStyle = BRAND;
  ctx.font = "800 34px sans-serif";
  ctx.textBaseline = "top";
  const label = KIND_LABEL[artifact.kind];
  const chipW = ctx.measureText(label).width + 56;
  ctx.beginPath();
  ctx.roundRect(pad, 120, chipW, 74, 37);
  ctx.fill();
  ctx.fillStyle = "#000000";
  ctx.fillText(label, pad + 28, 142);

  // Headline
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "800 82px sans-serif";
  const lines = wrap(ctx, artifact.title, width - pad * 2, 3);
  lines.forEach((line, i) => ctx.fillText(line, pad, 260 + i * 96));

  let y = 260 + lines.length * 96 + 24;

  if (artifact.place) {
    ctx.fillStyle = "rgba(255,255,255,0.72)";
    ctx.font = "600 42px sans-serif";
    ctx.fillText(artifact.place, pad, y);
    y += 72;
  }

  if (typeof artifact.credits === "number" && artifact.credits > 0) {
    ctx.fillStyle = BRAND;
    ctx.font = "800 120px sans-serif";
    ctx.fillText(`${artifact.credits} Credits`, pad, y + 12);
    y += 168;
  }

  if (artifact.note) {
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.font = "500 38px sans-serif";
    wrap(ctx, artifact.note, width - pad * 2, 2).forEach((line, i) =>
      ctx.fillText(line, pad, y + i * 52),
    );
  }

  // Footer wordmark + invite
  ctx.fillStyle = BRAND;
  ctx.font = "800 56px sans-serif";
  ctx.fillText("ONLOOKER LIVE", pad, height - 220);
  ctx.fillStyle = "rgba(255,255,255,0.78)";
  ctx.font = "600 36px sans-serif";
  ctx.fillText("See what's happening near you, right now.", pad, height - 146);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("Couldn't build that share card.");
  return new File([blob], `onlooker-${artifact.kind}.png`, { type: "image/png" });
}

/** Caption with hashtags and the sharer's referral link. */
export async function shareCaption(artifact: ShareArtifact): Promise<string> {
  const link = await referralLink();
  const bits = [artifact.title, artifact.place].filter(Boolean).join(", ");
  return `${bits}\nLive on Onlooker Live 👀 ${link}\n#OnlookerLive #LiveView`;
}

/**
 * One tap: build the card, open the native share sheet with the referral
 * caption, and fall back to downloading the card plus copying the caption.
 */
export async function shareArtifact(artifact: ShareArtifact): Promise<"shared" | "downloaded"> {
  const [file, caption] = await Promise.all([buildShareCard(artifact), shareCaption(artifact)]);

  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], text: caption, title: "Onlooker Live" });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "shared";
    }
  }

  const link = document.createElement("a");
  link.href = URL.createObjectURL(file);
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 10_000);
  try {
    await navigator.clipboard?.writeText(caption);
    toast.success("Card saved and caption copied, post it anywhere.");
  } catch {
    toast.success("Card saved to your device.");
  }
  return "downloaded";
}
