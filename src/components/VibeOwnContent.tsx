// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Radio, ShieldCheck } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { useOnlooker } from "@/lib/onlooker-store";
import { communityMediaUrls, isPostLive, listCommunityPosts, type CommunityPost } from "@/lib/community";
import type { CreatorVibe } from "@/lib/creator-vibes";

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/**
 * Vibes with no honest external data source (real estate visits, car spotting,
 * breaking reports, traffic) lead with Onlooker's own bounties and member posts
 * instead of unrelated map listings.
 */
export function VibeOwnContent({
  vibe,
  keywords,
}: {
  vibe: CreatorVibe;
  /** Extra words from the selected sub-filter chip. */
  keywords: string[];
}) {
  const own = vibe.ownContent;
  const { requests, claim } = useOnlooker();
  const [posts, setPosts] = useState<CommunityPost[] | null>(null);
  const [media, setMedia] = useState<Record<string, string>>({});

  useEffect(() => {
    let alive = true;
    void listCommunityPosts()
      .then(async (rows) => {
        if (!alive) return;
        const live = rows.filter(isPostLive);
        setPosts(live);
        const urls = await communityMediaUrls(live.slice(0, 30)).catch(() => ({}));
        if (alive) setMedia(urls);
      })
      .catch(() => alive && setPosts([]));
    return () => {
      alive = false;
    };
  }, []);

  const matchesKeywords = (text: string) =>
    keywords.length === 0 || keywords.some((word) => text.toLowerCase().includes(word));

  const bounties = useMemo(() => {
    if (!own) return [];
    return requests
      .filter((r) => r.status === "open" || r.status === "claimed")
      .filter((r) => r.category === own.bountyCategory)
      .filter((r) => matchesKeywords(`${r.title} ${r.place} ${r.note}`))
      .slice(0, 6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requests, own?.bountyCategory, keywords.join("|")]);

  const vibePosts = useMemo(() => {
    if (!posts) return [];
    return posts
      .filter(
        (post) =>
          post.tags.some((t) => t.toLowerCase() === vibe.id) || post.category === vibe.category,
      )
      .filter((post) => matchesKeywords(`${post.title} ${post.body} ${post.tags.join(" ")}`))
      .slice(0, 8);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [posts, vibe.id, vibe.category, keywords.join("|")]);

  if (!own) return null;

  return (
    <section className="mt-5">
      <h2 className="inline-flex items-center gap-2 text-lg font-extrabold italic uppercase tracking-tight text-foreground">
        <Radio className="size-4 text-signal" aria-hidden /> On Onlooker right now
      </h2>
      <p className="text-xs font-semibold text-signal">{own.blurb}</p>

      {own.showPros && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-2xl border border-signal/30 bg-signal/5 p-3">
          <ShieldCheck className="size-4 shrink-0 text-signal" aria-hidden />
          <p className="min-w-0 flex-1 text-xs font-medium text-muted-foreground">
            Need a verified walkthrough or exterior check? Our Pro network handles PIN-verified
            property visits.
          </p>
          <Link
            to="/pro-dashboard"
            className="rounded-xl border border-signal bg-signal px-3 py-1.5 text-[0.62rem] font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
          >
            Pro network
          </Link>
        </div>
      )}

      {bounties.length > 0 && (
        <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {bounties.map((request) => (
            <RequestCard key={request.id} request={request} compact onClaim={claim} />
          ))}
        </div>
      )}

      {vibePosts.length > 0 && (
        <ul className="-mx-1 mt-3 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
          {vibePosts.map((post) => {
            const img = post.mediaPath ? media[post.mediaPath] : undefined;
            return (
              <li key={post.id} className="w-44 shrink-0 snap-start">
                <Link
                  to="/community"
                  search={{ cat: vibe.id }}
                  className="group block overflow-hidden rounded-2xl border border-home-line bg-home-glass-strong hover:border-signal"
                >
                  <span className="relative block aspect-[4/3] overflow-hidden bg-surface">
                    {img && (
                      <img src={img} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />
                    )}
                  </span>
                  <span className="block p-2.5">
                    <span className="line-clamp-2 text-[0.72rem] font-bold leading-tight text-foreground group-hover:text-signal">
                      {post.title}
                    </span>
                    <span className="mt-1 flex items-center gap-1 truncate text-[0.55rem] font-medium text-muted-foreground">
                      <MapPin className="size-3 shrink-0" aria-hidden />
                      <span className="truncate">
                        {post.place ? `${post.place} · ` : ""}
                        {ago(post.createdAt)}
                      </span>
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {bounties.length === 0 && vibePosts.length === 0 && posts !== null && (
        <div className="mt-3 rounded-2xl border border-dashed border-border p-5 text-center">
          <p className="text-sm text-muted-foreground">
            Nothing live in {vibe.label.toLowerCase()} yet. Post a bounty and someone nearby can go
            film it.
          </p>
          <Link
            to="/post"
            className="mt-3 inline-block rounded-xl border border-signal bg-signal px-4 py-2 text-[0.64rem] font-extrabold uppercase tracking-[0.12em] text-signal-foreground"
          >
            Post a bounty
          </Link>
        </div>
      )}
    </section>
  );
}
