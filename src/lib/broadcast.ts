// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { createCommunityPost, type CommunityCategory } from "@/lib/community";
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

/** Max free streams one account can start per rolling hour (mirrored by a DB trigger). */
export const BROADCAST_HOURLY_LIMIT = 3;

export type BroadcastEligibility = {
  signedIn: boolean;
  allowed: boolean;
  /** When a temporary block (new-account cooldown or hourly cap) lifts. */
  retryAt: Date | null;
  /** Plain-language reason when streaming is temporarily blocked. */
  reason: string;
};

/**
 * Free streaming is open to every signed-in account. The only limits are a
 * 10-minute cooldown for brand-new accounts and an hourly cap, both enforced
 * server-side; this just explains them before the person fills the form.
 */
export async function fetchBroadcastEligibility(): Promise<BroadcastEligibility> {
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) {
    return { signedIn: false, allowed: false, retryAt: null, reason: "" };
  }
  const { data } = await supabase.rpc("my_broadcast_status");
  const row = (Array.isArray(data) ? data[0] : data) as
    | { cooldown_until: string | null; streams_last_hour: number; next_slot_at: string | null }
    | undefined;
  const now = Date.now();
  const cooldown = row?.cooldown_until ? new Date(row.cooldown_until) : null;
  if (cooldown && cooldown.getTime() > now) {
    return {
      signedIn: true,
      allowed: false,
      retryAt: cooldown,
      reason: "New accounts can start their first live stream 10 minutes after sign-up.",
    };
  }
  if ((row?.streams_last_hour ?? 0) >= BROADCAST_HOURLY_LIMIT) {
    return {
      signedIn: true,
      allowed: false,
      retryAt: row?.next_slot_at ? new Date(row.next_slot_at) : null,
      reason: `You can start up to ${BROADCAST_HOURLY_LIMIT} live streams per hour.`,
    };
  }
  return { signedIn: true, allowed: true, retryAt: null, reason: "" };
}

/** Turns the database safeguard errors into readable messages. */
export function describeBroadcastError(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error ?? "");
  if (/BROADCAST_COOLDOWN/.test(message)) {
    return "New accounts can start their first live stream 10 minutes after sign-up.";
  }
  if (/BROADCAST_RATE_LIMIT/.test(message)) {
    return `You can start up to ${BROADCAST_HOURLY_LIMIT} live streams per hour. Try again a bit later.`;
  }
  return message || "Couldn't start the broadcast.";
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
