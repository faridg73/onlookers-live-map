// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { MapPin, Sparkles } from "lucide-react";
import { useDiscoveryArea } from "@/hooks/use-discovery-area";
import { BROADCAST_CATEGORIES } from "@/lib/broadcast-categories";
import { COMMUNITY_VISUALS } from "@/lib/community-visuals";
import { communityMediaUrls, isPostLive, listCommunityPosts, type CommunityPost } from "@/lib/community";

const NEAR_MILES = 25;

function miles(aLat: number, aLng: number, bLat: number, bLng: number) {
  const r = 3958.8;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * r * Math.asin(Math.sqrt(h));
}

function ago(iso: string) {
  const m = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  return h < 24 ? `${h}h ago` : `${Math.round(h / 24)}d ago`;
}

/** Home rail: newest community posts, nearby first. */
export function LatestNearYouRail() {
  const { area } = useDiscoveryArea();
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

  const ranked = useMemo(() => {
    if (!posts) return [];
    return posts
      .map((post) => ({
        post,
        dist:
          post.latitude !== null && post.longitude !== null
            ? miles(area.latitude, area.longitude, post.latitude, post.longitude)
            : null,
      }))
      .sort((a, b) => {
        const an = a.dist !== null && a.dist <= NEAR_MILES ? 1 : 0;
        const bn = b.dist !== null && b.dist <= NEAR_MILES ? 1 : 0;
        if (an !== bn) return bn - an;
        return new Date(b.post.createdAt).getTime() - new Date(a.post.createdAt).getTime();
      })
      .slice(0, 12);
  }, [posts, area.latitude, area.longitude]);

  if (!posts || ranked.length === 0) return null;

  return (
    <section aria-labelledby="home-latest" className="rounded-3xl border border-home-line bg-home-glass p-3.5 backdrop-blur-2xl sm:p-4">
      <div className="flex items-center justify-between gap-2">
        <h3 id="home-latest" className="home-display flex items-center gap-2 text-[0.72rem] font-bold uppercase tracking-[0.14em] text-foreground">
          <Sparkles className="size-3.5 text-signal" /> Latest near you
        </h3>
        <Link to="/community" className="text-[0.6rem] font-extrabold uppercase tracking-[0.1em] text-muted-foreground hover:text-signal">
          See all
        </Link>
      </div>
      <ul className="-mx-1 mt-3 flex snap-x gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
        {ranked.map(({ post, dist }) => {
          const vibe = BROADCAST_CATEGORIES.find((c) => post.tags.some((t) => t.toLowerCase() === c.id));
          const img = (post.mediaPath && media[post.mediaPath]) || COMMUNITY_VISUALS[post.category]?.image;
          return (
            <li key={post.id} className="w-44 shrink-0 snap-start">
              <Link
                to="/community"
                search={vibe ? { cat: vibe.id } : {}}
                className="group block overflow-hidden rounded-2xl border border-home-line bg-home-glass-strong hover:border-signal"
              >
                <span className="relative block aspect-[4/3] overflow-hidden">
                  {img && <img src={img} alt="" className="absolute inset-0 size-full object-cover" loading="lazy" />}
                  <span className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" aria-hidden />
                  {vibe && (
                    <span className="absolute left-2 top-2 rounded-md bg-background/70 px-1.5 py-0.5 text-[0.55rem] font-extrabold uppercase text-foreground">
                      {vibe.icon} {vibe.label.split(" ")[0]}
                    </span>
                  )}
                </span>
                <span className="block p-2.5">
                  <span className="line-clamp-2 text-[0.72rem] font-bold leading-tight text-foreground group-hover:text-signal">{post.title}</span>
                  <span className="mt-1 flex items-center gap-1 truncate text-[0.55rem] font-medium text-muted-foreground">
                    <MapPin className="size-3 shrink-0" aria-hidden />
                    <span className="truncate">
                      {dist !== null ? `${dist < 1 ? "<1" : Math.round(dist)} mi · ` : ""}
                      {ago(post.createdAt)}
                    </span>
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
