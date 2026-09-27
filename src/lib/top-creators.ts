// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { resolveAvatarUrls } from "@/lib/profile";

export type TopCreator = {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  followerCount: number;
  totalViews: number;
  live: boolean;
};

/** Public creator ranking based on network followers, reach, and current live status. */
export async function listTopCreators(limit = 12): Promise<TopCreator[]> {
  const { data: profiles, error } = await supabase.rpc("public_top_creators", { _limit: limit });

  if (error) throw new Error(error.message);
  if (!profiles?.length) return [];

  const creatorIds = profiles.map((profile) => profile.id);
  const { data: posts } = await supabase
    .from("community_posts")
    .select("user_id, view_count, expires_at")
    .in("user_id", creatorIds);

  const now = Date.now();
  const activity = new Map<string, { views: number; live: boolean }>();
  for (const post of posts ?? []) {
    const current = activity.get(post.user_id) ?? { views: 0, live: false };
    const isLive = post.expires_at ? new Date(post.expires_at).getTime() > now : false;
    activity.set(post.user_id, {
      views: current.views + (post.view_count ?? 0),
      live: current.live || isLive,
    });
  }


  const avatars = await resolveAvatarUrls(profiles.map((profile) => profile.avatar_url));

  return profiles
    .map((profile, i) => ({
      id: profile.id,
      name: profile.name || "Onlooker",
      avatarUrl: avatars[i] ?? null,
      verified: Boolean(profile.is_verified),
      followerCount: profile.follower_count ?? 0,
      totalViews: activity.get(profile.id)?.views ?? 0,
      live: activity.get(profile.id)?.live ?? false,
    }))
    .sort((a, b) => b.followerCount - a.followerCount || b.totalViews - a.totalViews)
    .slice(0, limit);
}