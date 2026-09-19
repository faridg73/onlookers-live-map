// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";

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
    .from("posts")
    .select("user_id, is_live, views")
    .in("user_id", creatorIds);

  const activity = new Map<string, { views: number; live: boolean }>();
  for (const post of posts ?? []) {
    const current = activity.get(post.user_id) ?? { views: 0, live: false };
    activity.set(post.user_id, {
      views: current.views + (post.views ?? 0),
      live: current.live || Boolean(post.is_live),
    });
  }

  return profiles
    .map((profile) => ({
      id: profile.id,
      name: profile.name || "Onlooker",
      avatarUrl: profile.avatar_url,
      verified: Boolean(profile.is_verified),
      followerCount: profile.follower_count ?? 0,
      totalViews: activity.get(profile.id)?.views ?? 0,
      live: activity.get(profile.id)?.live ?? false,
    }))
    .sort((a, b) => b.followerCount - a.followerCount || b.totalViews - a.totalViews)
    .slice(0, limit);
}