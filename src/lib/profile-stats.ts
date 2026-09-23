// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { supabase } from "@/integrations/supabase/client";
import { fetchCreditWallet } from "@/lib/credits";

export type ProfileStats = { credits: number | null; shots: number | null; rating: number | null };

/** Real per-user numbers for the Profile header: wallet balance, clips sent, average review score. */
export async function fetchProfileStats(userId: string): Promise<ProfileStats> {
  const [wallet, shots, videos] = await Promise.all([
    fetchCreditWallet().catch(() => null),
    supabase.from("bounty_videos").select("id", { count: "exact", head: true }).eq("uploader_id", userId),
    supabase.from("bounty_videos").select("id").eq("uploader_id", userId).limit(1000),
  ]);

  let rating: number | null = null;
  const ids = (videos.data ?? []).map((v) => v.id);
  if (ids.length) {
    const { data } = await supabase.from("video_reviews").select("score").in("video_id", ids);
    const scores = (data ?? []).map((r) => r.score).filter((s): s is number => typeof s === "number");
    if (scores.length) rating = scores.reduce((a, b) => a + b, 0) / scores.length;
  }

  return {
    credits: wallet?.creditBalance ?? null,
    shots: shots.error ? null : (shots.count ?? 0),
    rating,
  };
}
