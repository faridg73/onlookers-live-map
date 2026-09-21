// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { sanitizeText } from "@/lib/sanitize";
import { supabase } from "@/integrations/supabase/client";
import { uploadMedia } from "@/lib/media-upload";

/** The broadcast lanes that open the Discover hub. */
export type CommunityCategory =
  | "breaking"
  | "culture"
  | "traffic"
  | "markets"
  | "meetups"
  | "arts"
  | "sports"
  | "general";

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
    id: "breaking",
    label: "Breaking News",
    blurb: "What's happening, as it happens",
    gradient: "linear-gradient(135deg,#FF5C5C 0%,#0F0F0F 72%)",
    tags: ["happening now", "accident", "weather", "road closure", "protest", "fire"],
    iceBreakers: [
      {
        title: "Something is happening on my block",
        body: "Live from the scene, showing what's visible from a safe public spot and which streets are affected.",
      },
      {
        title: "Emergency crews just arrived nearby",
        body: "Streaming the response from the sidewalk, including which roads are closed and the safest way around.",
      },
    ],
  },
  {
    id: "culture",
    label: "Community & Culture",
    blurb: "Festivals, parades and neighborhood life",
    gradient: "linear-gradient(135deg,#FF8FA3 0%,#0F0F0F 72%)",
    tags: ["street festival", "parade", "local history", "hidden gem", "street art", "food scene"],
    iceBreakers: [
      {
        title: "Festival from the inside",
        body: "Streaming the procession from the good side of the street, with the best viewing corners.",
      },
      {
        title: "Hidden gem walkthrough",
        body: "Showing a spot most people walk right past, and why it's worth the detour.",
      },
    ],
  },
  {
    id: "traffic",
    label: "Traffic & Public Updates",
    blurb: "Commutes, closures and transit status",
    gradient: "linear-gradient(135deg,#6BD5FF 0%,#0F0F0F 72%)",
    tags: ["commute", "road work", "transit", "parking", "detour"],
    iceBreakers: [
      {
        title: "Rush-hour check on the main corridor",
        body: "Live lane-by-lane look at the backup and where it finally opens up.",
      },
      {
        title: "Station platform status right now",
        body: "Showing how crowded it is, whether the delay boards are accurate and the alternate options.",
      },
    ],
  },
  {
    id: "markets",
    label: "Markets & Yard Sales",
    blurb: "Secondhand finds and street-side sellers",
    gradient: "linear-gradient(135deg,#FFE066 0%,#0F0F0F 72%)",
    tags: ["flea markets", "garage sales", "farmers markets", "street vendors", "antique fairs"],
    iceBreakers: [
      {
        title: "Flea market finds, live from the tables",
        body: "Walking the rows now, tell me what you want inspected or priced.",
      },
      {
        title: "Neighborhood garage sale walkthrough",
        body: "Showing furniture, books and household finds while they are still available.",
      },
    ],
  },
  {
    id: "meetups",
    label: "Meetups & Social",
    blurb: "Something happening, right now",
    gradient: "linear-gradient(135deg,#7CFF6B 0%,#0F0F0F 72%)",
    tags: ["tonight", "food", "new in town", "music", "outdoors", "free"],
    iceBreakers: [
      {
        title: "Street food crawl tonight",
        body: "Three stops, cash only, meet by the main entrance.",
      },
      {
        title: "New here, who wants coffee?",
        body: "Just moved in and looking for a couple of easy-going people to grab coffee with this week.",
      },
    ],
  },
  {
    id: "arts",
    label: "Arts & Performances",
    blurb: "Shows, buskers and gallery nights",
    gradient: "linear-gradient(135deg,#FF9E6B 0%,#0F0F0F 72%)",
    tags: ["live music", "street buskers", "theater", "gallery walk", "open mic"],
    iceBreakers: [
      {
        title: "Street busker on the main plaza right now",
        body: "Great set, decent crowd, streaming a few minutes from the footpath.",
      },
      {
        title: "Gallery walk before the crowds arrive",
        body: "A quiet lap through the open rooms with the standout pieces up close.",
      },
    ],
  },
  {
    id: "sports",
    label: "Sports & Recreational",
    blurb: "Pickup games, match days and group workouts",
    gradient: "linear-gradient(135deg,#9CE0FF 0%,#0F0F0F 72%)",
    tags: ["pickup game", "match day", "running", "skate", "fitness"],
    iceBreakers: [
      {
        title: "Pickup game in an hour",
        body: "Two players short. Bring water, we play until the lights go off.",
      },
      {
        title: "Match day scene outside the stadium",
        body: "Showing the entry lines, the lot and the fan atmosphere before kickoff.",
      },
    ],
  },
  {
    id: "general",
    label: "General",
    blurb: "Anything else worth showing live",
    gradient: "linear-gradient(135deg,#CCFF00 0%,#0F0F0F 70%)",
    tags: ["just looking around", "ask me anything", "day in the life", "scenic views"],
    iceBreakers: [
      {
        title: "Live wander through the neighborhood",
        body: "No agenda, just showing what's around right now and answering questions as they come in.",
      },
      {
        title: "Ask a local anything",
        body: "Live from the main square, answering questions about the area in real time.",
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
  /** Set when the post is a real local event listing with a start date and time. */
  eventStartsAt: string | null;
  authorName: string;
  authorAvatar: string | null;
  hunterLevel: number;
  authorVerified: boolean;
  reportIncidentType: string | null;
  reportRadiusM: number | null;
  mediaAnalysisStatus: "not_required" | "analyzing" | "complete";
  reporterTrustLevel: number | null;
  validationCount: number;
  flagCount: number;
  trustScore: number;
  reportStatus: "confirmed" | "disputed" | "unverified" | "expired" | null;
};

const BUCKET = "chat-attachments";
const COLUMNS =
  "id, user_id, category, tags, title, body, place, latitude, longitude, media_path, aspect, is_flash, expires_at, pinned_until, pinned_credits, created_at, event_starts_at, report_incident_type, report_radius_m, media_analysis_status, reporter_trust_level, validation_count, flag_count, trust_score, report_status";

function isPinned(post: { pinnedUntil: string | null }) {
  return Boolean(post.pinnedUntil && new Date(post.pinnedUntil).getTime() > Date.now());
}

/**
 * Guests see a limited public feed: locations are rounded to roughly a mile and
 * the poster's account id is left out, so nobody's live whereabouts is exposed
 * to the open internet. Signed-in members get the exact detail.
 */
async function listPublicCommunityPosts(
  category?: CommunityCategory,
): Promise<CommunityPost[]> {
  const { data, error } = await supabase.rpc("public_community_feed", {
    ...(category ? { _category: category } : {}),
    _limit: 120,
  });
  if (error) throw new Error(error.message);

  return (data ?? []).map((r) => ({
    id: r.id,
    userId: "",
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
    eventStartsAt: r.event_starts_at ?? null,
    authorName: r.author_name ?? "Onlooker",
    authorAvatar: null,
    hunterLevel: r.hunter_level ?? 1,
    authorVerified: Boolean(r.author_verified),
    reportIncidentType: r.report_incident_type ?? null,
    reportRadiusM: r.report_radius_m ?? null,
    mediaAnalysisStatus: r.media_analysis_status === "analyzing" || r.media_analysis_status === "complete" ? r.media_analysis_status : "not_required",
    reporterTrustLevel: r.reporter_trust_level ?? null,
    validationCount: r.validation_count ?? 0,
    flagCount: r.flag_count ?? 0,
    trustScore: r.trust_score ?? 0,
    reportStatus: r.report_status === "confirmed" || r.report_status === "disputed" || r.report_status === "expired" ? r.report_status : r.report_incident_type ? "unverified" : null,
  }));
}

/** Everything live on the Discover hub, pinned posts first, then newest. */
export async function listCommunityPosts(category?: CommunityCategory): Promise<CommunityPost[]> {
  const { data: auth } = await supabase.auth.getSession();
  if (!auth.session) return listPublicCommunityPosts(category);

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
  const authors = new Map<string, { name: string; avatar: string | null; level: number; verified: boolean }>();
  if (authorIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase.rpc("public_creator_cards", {
      _ids: authorIds,
    });
    if (profileError) console.error("[community] could not load post authors", profileError);
    for (const p of profiles ?? []) {
      authors.set(p.id, {
        name: p.name || "Onlooker",
        avatar: p.avatar_url ?? null,
        level: p.hunter_level ?? 1,
        verified: Boolean(p.is_verified),
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
    eventStartsAt: r.event_starts_at ?? null,
    authorName: authors.get(r.user_id)?.name ?? "Onlooker",
    authorAvatar: authors.get(r.user_id)?.avatar ?? null,
    hunterLevel: authors.get(r.user_id)?.level ?? 1,
    authorVerified: authors.get(r.user_id)?.verified ?? false,
    reportIncidentType: r.report_incident_type ?? null,
    reportRadiusM: r.report_radius_m ?? null,
    mediaAnalysisStatus: r.media_analysis_status === "analyzing" || r.media_analysis_status === "complete" ? r.media_analysis_status : "not_required",
    reporterTrustLevel: r.reporter_trust_level ?? null,
    validationCount: r.validation_count ?? 0,
    flagCount: r.flag_count ?? 0,
    trustScore: r.trust_score ?? 0,
    reportStatus: r.report_status === "confirmed" || r.report_status === "disputed" || r.report_status === "expired" ? r.report_status : r.report_incident_type ? "unverified" : null,
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
  const extension = file.type.startsWith("video/")
    ? file.type.includes("webm")
      ? "webm"
      : "mp4"
    : file.type.includes("png")
      ? "png"
      : "jpg";
  const path = `${auth.user.id}/community/${crypto.randomUUID()}.${extension}`;
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
  reportIncidentType?: string | null;
  reportRadiusM?: number | null;
  mediaAnalysisStatus?: "not_required" | "analyzing" | "complete";
  /** ISO start time when this post is a real local event listing. */
  eventStartsAt?: string | null;
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
      title: sanitizeText(input.title, { maxLength: 160 }),
      body: sanitizeText(input.body, { multiline: true, maxLength: 2000 }),
      place: sanitizeText(input.place, { maxLength: 160 }),
      tags: input.tags.map((tag) => sanitizeText(tag, { maxLength: 40 })).filter(Boolean),
      media_path: input.mediaPath ?? null,
      aspect: input.aspect ?? "16:9",
      is_flash: input.isFlash,
      expires_at: expiresAt,
      latitude: input.latitude ?? null,
      longitude: input.longitude ?? null,
      report_incident_type: input.reportIncidentType ?? null,
      report_radius_m: input.reportRadiusM ?? null,
      media_analysis_status: input.mediaAnalysisStatus ?? "not_required",
      event_starts_at: input.eventStartsAt ?? null,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return data.id;
}

export async function voteOnCommunityReport(postId: string, vote: "validate" | "flag") {
  const { data, error } = await supabase.rpc("vote_on_community_report", {
    _post_id: postId,
    _vote: vote,
  });
  if (error) {
    if (/duplicate key/i.test(error.message)) throw new Error("You already responded to this report.");
    throw new Error(error.message);
  }
  return data?.[0] ?? null;
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
