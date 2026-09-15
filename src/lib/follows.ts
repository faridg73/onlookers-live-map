import { supabase } from "@/integrations/supabase/client";

/** Whether the signed-in user follows this creator, plus the live follower count. */
export async function fetchFollowState(
  creatorId: string,
): Promise<{ following: boolean; followerCount: number }> {
  const [{ data: auth }, { data: profile }] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from("profiles").select("follower_count").eq("id", creatorId).maybeSingle(),
  ]);

  let following = false;
  if (auth.user && auth.user.id !== creatorId) {
    const { data } = await supabase
      .from("user_follows")
      .select("id")
      .eq("follower_id", auth.user.id)
      .eq("followee_id", creatorId)
      .maybeSingle();
    following = Boolean(data);
  }

  return { following, followerCount: profile?.follower_count ?? 0 };
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
  const { data } = await supabase
    .from("profiles")
    .select("follower_count")
    .eq("id", creatorId)
    .maybeSingle();
  return data?.follower_count ?? 0;
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
