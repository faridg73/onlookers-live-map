// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";

/** Whether the signed-in user follows this creator, plus the live follower count. */
export async function fetchFollowState(
  creatorId: string,
): Promise<{ following: boolean; followerCount: number }> {
  const [{ data: auth, error: authError }, { data: cards, error: profileError }] =
    await Promise.all([
      supabase.auth.getUser(),
      supabase.rpc("public_creator_cards", { _ids: [creatorId] }),
    ]);
  const profile = cards?.[0] ?? null;

  // Never fail silently: a broken read here would leave the pill stuck on "Follow".
  if (authError) console.error("[follows] could not read the signed-in user", authError);
  if (profileError) {
    console.error("[follows] could not read the follower count", profileError);
    throw new Error(profileError.message);
  }

  let following = false;
  if (auth.user && auth.user.id !== creatorId) {
    const { data, error } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", auth.user.id)
      .eq("followee_id", creatorId)
      .maybeSingle();
    if (error) {
      console.error("[follows] could not read the follow relationship", error);
      throw new Error(error.message);
    }
    following = Boolean(data);
  }

  return { following, followerCount: profile?.follower_count ?? 0 };
}

/** Broadcast so every open follow surface refreshes after a follow or unfollow. */
export const FOLLOWS_CHANGED_EVENT = "onlooker:follows-changed";

export function notifyFollowsChanged() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(FOLLOWS_CHANGED_EVENT));
}

export type FollowedCreator = {
  id: string;
  name: string;
  avatarUrl: string | null;
  verified: boolean;
  followerCount: number;
};

/** Creator ids the signed-in member follows. Empty for guests. */
export async function listFollowedCreatorIds(): Promise<string[]> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return [];
  const { data, error } = await supabase
    .from("user_follows")
    .select("followee_id")
    .eq("follower_id", auth.user.id);
  if (error) {
    console.error("[follows] could not list followed creators", error);
    throw new Error(error.message);
  }
  return (data ?? []).map((row) => row.followee_id);
}

/** Creators the signed-in member follows, with display details. */
export async function listFollowedCreators(): Promise<FollowedCreator[]> {
  const ids = await listFollowedCreatorIds();
  if (ids.length === 0) return [];
  const { data, error } = await supabase.rpc("public_creator_cards", { _ids: ids });
  if (error) {
    console.error("[follows] could not load followed creator profiles", error);
    throw new Error(error.message);
  }
  return (data ?? []).map((p) => ({
    id: p.id,
    name: p.name || "Onlooker",
    avatarUrl: p.avatar_url,
    verified: Boolean(p.is_verified),
    followerCount: p.follower_count ?? 0,
  }));
}

export async function followCreator(creatorId: string): Promise<number> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to follow creators.");
  if (auth.user.id === creatorId) throw new Error("You can't follow yourself.");

  const { error } = await supabase
    .from("user_follows")
    .insert({ follower_id: auth.user.id, followee_id: creatorId });
  if (error && error.code !== "23505") throw error; // already following = fine

  return fetchFollowerCount(creatorId);
}

export async function unfollowCreator(creatorId: string): Promise<number> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) throw new Error("Sign in to manage follows.");

  const { error } = await supabase
    .from("user_follows")
    .delete()
    .eq("follower_id", auth.user.id)
    .eq("followee_id", creatorId);
  if (error) throw error;

  return fetchFollowerCount(creatorId);
}

async function fetchFollowerCount(creatorId: string): Promise<number> {
  const { data, error } = await supabase.rpc("public_creator_cards", { _ids: [creatorId] });
  if (error) console.error("[follows] could not refresh the follower count", error);
  return data?.[0]?.follower_count ?? 0;
}

/** Realtime subscription to a creator's follower count. Returns an unsubscribe fn. */
export function watchFollowerCount(
  creatorId: string,
  onCount: (count: number) => void,
): () => void {
  const channel = supabase
    .channel(`follower-count:${creatorId}`)
    .on(
      "postgres_changes",
      { event: "UPDATE", schema: "public", table: "profiles", filter: `id=eq.${creatorId}` },
      (payload) => {
        const next = (payload.new as { follower_count?: number }).follower_count;
        if (typeof next === "number") onCount(next);
      },
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
}
