// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createCommunityPost, type CommunityCategory } from "@/lib/community";
import { fetchTrustStats } from "@/lib/trust";
import { fetchMyVerification } from "@/lib/verification";
import { supabase } from "@/integrations/supabase/client";

/**
 * Free Social Broadcast.
 *
 * A verified creator can go live for their followers and anyone nearby with no
 * credits and no escrow. The broadcast lives on Discover as a short-lived
 * flash post so it drops off the feed when the stream is over.
 */

/** How long a free broadcast stays on the feed, in hours. */
export const BROADCAST_WINDOWS = [
  { hours: 0.25, label: "15 min", tier: "Quick Snap" },
  { hours: 0.5, label: "30 min", tier: "Standard Broadcast" },
  { hours: 1, label: "1-Hour", tier: "Extended Coverage" },
] as const;

/** Who can see a broadcast while it is live. */
export type BroadcastAudience = "public" | "followers" | "private";

export const BROADCAST_AUDIENCES = [
  { id: "public", label: "Public", hint: "Everyone on the map" },
  { id: "followers", label: "Followers only", hint: "People who follow you" },
  { id: "private", label: "Private", hint: "Only you, for testing" },
] as const satisfies ReadonlyArray<{ id: BroadcastAudience; label: string; hint: string }>;

/** Community guidelines line shown right above the go-live button. */
export const BROADCAST_SAFETY_NOTICE =
  "By going live, you agree to follow safety rules. No illegal activity or driving violations.";

/** Level at which a creator can broadcast for free without a track record badge. */
export const BROADCAST_MIN_LEVEL = 2;

export type BroadcastEligibility = {
  signedIn: boolean;
  allowed: boolean;
  level: number;
  completed: number;
  /** Plain-language reason when broadcasting is not open yet. */
  reason: string;
};

/** Checks whether the signed-in person can stream for free. */
export async function fetchBroadcastEligibility(): Promise<BroadcastEligibility> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return {
      signedIn: false,
      allowed: false,
      level: 0,
      completed: 0,
      reason: "Sign in to start a free broadcast.",
    };
  }
  const [trust, verification] = await Promise.all([
    fetchTrustStats(auth.user.id).catch(() => null),
    fetchMyVerification().catch(() => null),
  ]);
  const level = trust?.hunterLevel ?? 1;
  const completed = trust?.completedClaims ?? 0;
  const allowed =
    Boolean(verification?.isVerified) || Boolean(trust?.verified) || level >= BROADCAST_MIN_LEVEL;
  return {
    signedIn: true,
    allowed,
    level,
    completed,
    reason: allowed
      ? ""
      : verification?.requestedAt
        ? "Your creator verification is in review, free broadcasting unlocks once it's approved."
        : "Free broadcasting opens once you're a verified creator, apply on your profile, or deliver a couple of paid captures to unlock it.",
  };
}

/** Publishes a free live broadcast to Discover and the nearby feed. */
export function startFreeBroadcast(input: {
  category: CommunityCategory;
  title: string;
  body: string;
  place: string;
  hours: number;
  audience?: BroadcastAudience;
  tags?: string[];
  latitude?: number | null;
  longitude?: number | null;
  mediaPath?: string | null;
}): Promise<string> {
  const audience = input.audience ?? "public";
  return createCommunityPost({
    category: input.category,
    title: input.title,
    body: input.body,
    place: input.place,
    tags: ["live", "free broadcast", `audience:${audience}`, ...(input.tags ?? [])],
    mediaPath: input.mediaPath ?? null,
    isFlash: true,
    flashHours: input.hours,
    latitude: input.latitude ?? null,
    longitude: input.longitude ?? null,
  });
}
