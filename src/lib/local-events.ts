// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { communityMediaUrls, listCommunityPosts, type CommunityPost } from "@/lib/community";
import type { LiveEvent } from "@/lib/events.functions";

/** Events posted by members stay listed until 6 hours after they start. */
const GRACE_MS = 6 * 60 * 60 * 1000;

function splitLocal(iso: string) {
  const when = new Date(iso);
  if (Number.isNaN(when.getTime())) return { date: null, time: null };
  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
    time: `${pad(when.getHours())}:${pad(when.getMinutes())}`,
  };
}

function toLiveEvent(post: CommunityPost, imageUrl: string | null): LiveEvent {
  const startsAt = post.eventStartsAt!;
  const { date, time } = splitLocal(startsAt);
  const hasPin = post.latitude !== null && post.longitude !== null;
  return {
    id: `onlooker-${post.id}`,
    source: "onlooker",
    scope: "local",
    name: post.title,
    startsAt,
    localDate: date,
    localTime: time,
    venueName: post.place || null,
    city: null,
    latitude: post.latitude,
    longitude: post.longitude,
    category: "Local event",
    imageUrl,
    ticketUrl: hasPin ? `/?at=${post.latitude},${post.longitude}` : "/community",
    priceFrom: null,
    currency: null,
  };
}

/**
 * Real events posted by members, shaped like the ticketed listings so Explore,
 * Discover and the vibe feeds can show them side by side.
 */
export async function fetchLocalUserEvents(): Promise<LiveEvent[]> {
  const posts = await listCommunityPosts();
  const upcoming = posts
    .filter((post) => post.eventStartsAt)
    .filter((post) => new Date(post.eventStartsAt!).getTime() > Date.now() - GRACE_MS)
    .sort(
      (a, b) => new Date(a.eventStartsAt!).getTime() - new Date(b.eventStartsAt!).getTime(),
    );
  if (upcoming.length === 0) return [];

  let media: Record<string, string> = {};
  try {
    media = await communityMediaUrls(upcoming);
  } catch {
    media = {};
  }

  return upcoming.map((post) =>
    toLiveEvent(post, post.mediaPath ? (media[post.mediaPath] ?? null) : null),
  );
}
