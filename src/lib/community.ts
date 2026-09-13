import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media-upload";

/** The community categories that open the Discover hub. */
export type CommunityCategory =
  | "friends"
  | "meetups"
  | "tutorials"
  | "language"
  | "culture";

export type CommunityCategoryDef = {
  id: CommunityCategory;
  label: string;
  blurb: string;
  /** Fallback gradient for cards without a photo. */
  gradient: string;
  tags: string[];
  /** Quick-fill Ice-Breakers so nobody stares at a blank box. */
  iceBreakers: { title: string; body: string }[];
};

export const COMMUNITY_CATEGORIES: CommunityCategoryDef[] = [
  {
    id: "friends",
    label: "Find Friends",
    blurb: "New in town or just up for company",
    gradient: "linear-gradient(135deg,#CCFF00 0%,#0F0F0F 70%)",
    tags: ["new in town", "coffee", "walk", "gym", "20s", "30s"],
    iceBreakers: [
      {
        title: "New here — who wants coffee?",
        body: "Just moved in and looking for a couple of easy-going people to grab coffee with this week.",
      },
      {
        title: "Sunday morning walk crew",
        body: "Easy 5k loop, slow pace, good chat. Everyone welcome.",
      },
    ],
  },
  {
    id: "meetups",
    label: "Meetups",
    blurb: "Something happening, right now",
    gradient: "linear-gradient(135deg,#7CFF6B 0%,#0F0F0F 72%)",
    tags: ["tonight", "food", "music", "sports", "outdoors", "free"],
    iceBreakers: [
      {
        title: "Pickup game in an hour",
        body: "Two players short. Bring water, we play until the lights go off.",
      },
      {
        title: "Street food crawl tonight",
        body: "Three stops, cash only, meet by the main entrance.",
      },
    ],
  },
  {
    id: "tutorials",
    label: "Tutorials",
    blurb: "Show someone how it's done",
    gradient: "linear-gradient(135deg,#FFD166 0%,#0F0F0F 72%)",
    tags: ["beginner", "cooking", "music", "repair", "tech", "10 min"],
    iceBreakers: [
      {
        title: "I'll show you how to fix a flat",
        body: "Ten minutes, bring your bike, you'll never pay for it again.",
      },
      {
        title: "First three guitar chords, live",
        body: "Hop on the stream with a guitar and we'll get you playing a song today.",
      },
    ],
  },
  {
    id: "language",
    label: "Language Exchange",
    blurb: "Half your language, half mine",
    gradient: "linear-gradient(135deg,#6BD5FF 0%,#0F0F0F 72%)",
    tags: ["english", "spanish", "french", "japanese", "beginner", "fluent"],
    iceBreakers: [
      {
        title: "Spanish ↔ English, 30/30",
        body: "Half an hour each way, no textbooks, we just talk about our week.",
      },
      {
        title: "Practice ordering food with me",
        body: "Live from a real counter — you order, I translate, we both learn.",
      },
    ],
  },
  {
    id: "culture",
    label: "Local Culture",
    blurb: "The version tourists never see",
    gradient: "linear-gradient(135deg,#FF8FA3 0%,#0F0F0F 72%)",
    tags: ["market", "festival", "history", "hidden gem", "street art"],
    iceBreakers: [
      {
        title: "Market walkthrough, live",
        body: "I'll walk the stalls and show you what locals actually buy.",
      },
      {
        title: "Festival from the inside",
        body: "Streaming the procession from the good side of the street.",
      },
    ],
  },
];

export function categoryDef(id: string): CommunityCategoryDef {
  return COMMUNITY_CATEGORIES.find((c) => c.id === id) ?? COMMUNITY_CATEGORIES[0]!;
}

/** How long a Flash Meetup can stay up. */
export const FLASH_HOURS = [3, 4, 5, 6] as const;

/** What it costs to pin a post to the top of Discover. */
export const PIN_CREDIT_OPTIONS = [4, 8, 20] as const;
export const PIN_HOURS = 6;

export type CommunityPost = {
  id: string;
  userId: string;
  category: CommunityCategory;
  tags: string[];
  title: string;
  body: string;
  place: string;
  latitude: number | null;
  longitude: number | null;
  mediaPath: string | null;
  aspect: "16:9" | "4:3";
  isFlash: boolean;
  expiresAt: string | null;
  pinnedUntil: string | null;
  pinnedCredits: number;
  createdAt: string;
  authorName: string;
  authorAvatar: string | null;
  hunterLevel: number;
};

const BUCKET = "chat-attachments";
const COLUMNS =
  "id, user_id, category, tags, title, body, place, latitude, longitude, media_path, aspect, is_flash, expires_at, pinned_until, pinned_credits, created_at";

function isPinned(post: { pinnedUntil: string | null }) {
  return Boolean(post.pinnedUntil && new Date(post.pinnedUntil).getTime() > Date.now());
}

/** Everything live on the Discover hub, pinned posts first, then newest. */
export async function listCommunityPosts(category?: CommunityCategory): Promise<CommunityPost[]> {
  let query = supabase
    .from("community_posts")
    .select(COLUMNS)
    .order("created_at", { ascending: false })
    .limit(120);
  if (category) query = query.eq("category", category);

  const { data, error } = await query;
  if (error) throw new Error(error.message);

  const rows = data ?? [];
  const authorIds = [...new Set(rows.map((r) => r.user_id))];
  const authors = new Map<string, { name: string; avatar: string | null; level: number }>();
  if (authorIds.length > 0) {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, avatar_url, hunter_level, is_incognito, alias")
      .in("id", authorIds);
    for (const p of profiles ?? []) {
      authors.set(p.id, {
        name: p.is_incognito ? (p.alias ?? "Onlooker") : (p.display_name ?? "Onlooker"),
        avatar: p.is_incognito ? null : (p.avatar_url ?? null),
        level: p.hunter_level ?? 1,
      });
    }
  }

  const posts: CommunityPost[] = rows.map((r) => ({
    id: r.id,
    userId: r.user_id,
    category: r.category as CommunityCategory,
    tags: r.tags ?? [],
    title: r.title,
    body: r.body ?? "",
    place: r.place ?? "",
    latitude: r.latitude,
    longitude: r.longitude,
    mediaPath: r.media_path,
    aspect: r.aspect === "4:3" ? "4:3" : "16:9",
    isFlash: r.is_flash,
    expiresAt: r.expires_at,
    pinnedUntil: r.pinned_until,
    pinnedCredits: r.pinned_credits ?? 0,
    createdAt: r.created_at,
    authorName: authors.get(r.user_id)?.name ?? "Onlooker",
    authorAvatar: authors.get(r.user_id)?.avatar ?? null,
    hunterLevel: authors.get(r.user_id)?.level ?? 1,
  }));

  return posts.sort((a, b) => {
    const pinDiff = Number(isPinned(b)) - Number(isPinned(a));
    if (pinDiff !== 0) return pinDiff;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

/** Short-lived viewing links for the photos attached to these posts. */
export async function communityMediaUrls(posts: CommunityPost[]) {
  const paths = posts.map((p) => p.mediaPath).filter((p): p is string => Boolean(p));
  if (paths.length === 0) return {};
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, 60 * 60);
  const out: Record<string, string> = {};
  for (const row of data ?? []) {
    if (row.path && row.signedUrl) out[row.path] = row.signedUrl;
  }
  return out;
}

/** Uploads a live camera still for a Discover post. */
export async function uploadCommunityPhoto(file: File) {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to add a photo.");
  const path = `${auth.user.id}/community/${crypto.randomUUID()}.jpg`;
  await uploadMedia({ bucket: BUCKET, path, file, contentType: file.type || "image/jpeg" });
  return path;
}

export async function createCommunityPost(input: {
  category: CommunityCategory;
  title: string;
  body: string;
  place: string;
  tags: string[];
  mediaPath?: string | null;
  aspect?: "16:9" | "4:3";
  isFlash: boolean;
  flashHours?: number;
  latitude?: number | null;
  longitude?: number | null;
}): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to post.");

  const expiresAt = input.isFlash
    ? new Date(Date.now() + (input.flashHours ?? 3) * 3_600_000).toISOString()
    : null;

  const { data, error } = await supabase
    .from("community_posts")
    .insert({
      user_id: auth.user.id,
      category: input.category,
      title: input.title.trim(),
      body: input.body.trim(),
      place: input.place.trim(),
      tags: input.tags,
      media_path: input.mediaPath ?? null,
      aspect: input.aspect ?? "16:9",
      is_flash: input.isFlash,
      expires_at: expiresAt,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

/** Spends Credits to pin a post to the top of Discover; returns the new end time. */
export async function pinCommunityPost(postId: string, credits: number) {
  const { data, error } = await supabase.rpc("pin_community_post", {
    _post_id: postId,
    _credits: Math.round(credits),
    _hours: PIN_HOURS,
  });
  if (error) {
    if (/insufficient credits/i.test(error.message)) throw new Error("Insufficient Credits");
    throw new Error(error.message);
  }
  return data as unknown as string;
}

export async function deleteCommunityPost(postId: string) {
  const { error } = await supabase.from("community_posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
}

/** "2h 14m left" for a Flash Meetup, or null once it is gone. */
export function timeLeftLabel(expiresAt: string | null): string | null {
  if (!expiresAt) return null;
  const ms = new Date(expiresAt).getTime() - Date.now();
  if (ms <= 0) return null;
  const mins = Math.floor(ms / 60_000);
  const hours = Math.floor(mins / 60);
  return hours > 0 ? `${hours}h ${mins % 60}m left` : `${mins}m left`;
}

export { isPinned };
