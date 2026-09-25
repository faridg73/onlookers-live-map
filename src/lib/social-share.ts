// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { toast } from "sonner";

/**
 * Social sharing and syndication for live streams and map pins.
 *
 * Every share points at a public landing page that carries its own preview
 * card (title, location, #Onlooker branding), so a pasted link unfurls
 * properly on X, Facebook, WhatsApp, iMessage and Slack. Instagram and TikTok
 * have no web share target, so those buttons copy a ready-made caption and
 * open the app's camera instead.
 */

export const SITE_URL = "https://onlookerlive.com";
export const BRAND_HASHTAGS = ["Onlooker", "OnlookerLive"] as const;

export type ShareSubject = {
  /** A live broadcast, or a funded pin on the map. */
  kind: "live" | "pin";
  /** Stable id used in the public link. */
  id: string;
  title: string;
  place: string;
  /** Credit reward or per-minute headline, when there is one. */
  credits?: number | undefined;
  latitude?: number | null | undefined;
  longitude?: number | null | undefined;
};

function origin(): string {
  if (typeof window === "undefined") return SITE_URL;
  // Share links always use the public domain, even from the app preview.
  return window.location.hostname.endsWith("lovable.app") ? SITE_URL : window.location.origin;
}

function params(subject: ShareSubject): string {
  const search = new URLSearchParams({ title: subject.title, place: subject.place });
  if (subject.credits) search.set("credits", String(Math.round(subject.credits)));
  if (subject.latitude != null && subject.longitude != null) {
    search.set("lat", subject.latitude.toFixed(5));
    search.set("lng", subject.longitude.toFixed(5));
  }
  return search.toString();
}

/** Public landing page for this stream or pin, with its own preview card. */
export function shareLink(subject: ShareSubject): string {
  const path = subject.kind === "live" ? "live" : "b";
  return `${origin()}/${path}/${subject.id}?${params(subject)}`;
}

/** Page an external site embeds in an iframe. */
export function embedLink(subject: ShareSubject): string {
  return `${origin()}/embed/${subject.id}?${params(subject)}`;
}

/** Embed of the whole live map, for a newsroom that wants everything. */
export function mapEmbedLink(): string {
  return `${origin()}/embed`;
}

export const BRAND_TAG_TEXT = BRAND_HASHTAGS.map((tag) => `#${tag}`).join(" ");

/** Caption used on every platform, so shares read consistently. */
export function shareCaption(subject: ShareSubject): string {
  const lead = subject.kind === "live" ? "🔴 LIVE NOW" : "📍 Live view wanted";
  const reward = subject.credits ? ` · ${Math.round(subject.credits)} Credits` : "";
  return `${lead}: ${subject.title}, ${subject.place}${reward}\n${BRAND_TAG_TEXT}`;
}

export type SocialTarget = {
  id: "x" | "instagram" | "tiktok" | "whatsapp" | "facebook" | "telegram";
  label: string;
  /** True when the app can only be opened with the caption on the clipboard. */
  captionFirst: boolean;
  hint: string;
};

export const SOCIAL_TARGETS: SocialTarget[] = [
  { id: "x", label: "X (Twitter)", captionFirst: false, hint: "Opens a ready-to-post tweet" },
  {
    id: "instagram",
    label: "Instagram Story",
    captionFirst: true,
    hint: "Copies the caption, opens the story camera",
  },
  {
    id: "tiktok",
    label: "TikTok Story",
    captionFirst: true,
    hint: "Copies the caption, opens TikTok",
  },
  { id: "whatsapp", label: "WhatsApp", captionFirst: false, hint: "Sends the link in a chat" },
  { id: "facebook", label: "Facebook", captionFirst: false, hint: "Opens a Facebook post" },
  { id: "telegram", label: "Telegram", captionFirst: false, hint: "Sends the link in a chat" },
];

export function platformShareUrl(
  target: SocialTarget["id"],
  url: string,
  caption: string,
): string {
  return webTarget(target, url, caption);
}

function webTarget(target: SocialTarget["id"], url: string, caption: string): string {
  const link = encodeURIComponent(url);
  const text = encodeURIComponent(caption);
  switch (target) {
    case "x":
      return `https://twitter.com/intent/tweet?url=${link}&text=${text}&hashtags=${BRAND_HASHTAGS.join(",")}`;
    case "whatsapp":
      return `https://wa.me/?text=${encodeURIComponent(`${caption}\n${url}`)}`;
    case "facebook":
      return `https://www.facebook.com/sharer/sharer.php?u=${link}&quote=${text}`;
    case "telegram":
      return `https://t.me/share/url?url=${link}&text=${text}`;
    case "instagram":
      // No web share target: the story camera is the closest thing to one.
      return "instagram://story-camera";
    case "tiktok":
      return "https://www.tiktok.com/upload?lang=en";
  }
}

async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Sends this stream or pin to one platform. */
export async function shareToPlatform(subject: ShareSubject, target: SocialTarget) {
  const url = shareLink(subject);
  const caption = shareCaption(subject);

  if (target.captionFirst) {
    const copied = await copy(`${caption}\n${url}`);
    toast[copied ? "success" : "error"](
      copied
        ? `Caption copied, paste it into your ${target.label}.`
        : "Couldn't copy the caption. Copy the link instead.",
    );
    if (typeof window !== "undefined") {
      window.open(webTarget(target.id, url, caption), "_blank", "noopener,noreferrer");
    }
    return;
  }

  if (typeof window !== "undefined") {
    window.open(webTarget(target.id, url, caption), "_blank", "noopener,noreferrer");
  }
}

/** Device share sheet where one exists, clipboard everywhere else. */
export async function shareNatively(subject: ShareSubject) {
  const url = shareLink(subject);
  const caption = shareCaption(subject);
  const nav = typeof navigator === "undefined" ? null : navigator;
  if (nav?.share) {
    try {
      await nav.share({ title: subject.title, text: caption, url });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }
  const copied = await copy(`${caption}\n${url}`);
  toast[copied ? "success" : "error"](
    copied ? "Link copied, paste it anywhere." : "Couldn't copy that link.",
  );
}

export async function copyShareLink(subject: ShareSubject) {
  const copied = await copy(shareLink(subject));
  toast[copied ? "success" : "error"](copied ? "Link copied." : "Couldn't copy that link.");
}

/** Ready-to-paste iframe for news sites and blogs. */
export function embedSnippet(subject: ShareSubject): string {
  const src = embedLink(subject);
  return [
    `<iframe src="${src}"`,
    `  title="Onlooker live view, ${subject.place.replace(/"/g, "&quot;")}"`,
    '  width="100%" height="480" loading="lazy"',
    '  style="border:0;border-radius:16px;max-width:640px"',
    '  allow="fullscreen"></iframe>',
  ].join("\n");
}

/** Ready-to-paste iframe of every active Onlooker feed. */
export function mapEmbedSnippet(): string {
  return [
    `<iframe src="${mapEmbedLink()}"`,
    '  title="Onlooker live map" width="100%" height="560" loading="lazy"',
    '  style="border:0;border-radius:16px" allow="fullscreen"></iframe>',
  ].join("\n");
}

export async function copyEmbedSnippet(snippet: string) {
  const copied = await copy(snippet);
  toast[copied ? "success" : "error"](
    copied ? "Embed code copied, paste it into your article." : "Couldn't copy the embed code.",
  );
}
