import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Clock, Eye, MapPin, Video } from "lucide-react";
import { LoopingPreview } from "@/components/LoopingPreview";
import { fetchExploreClips, type ExploreClip } from "@/lib/explore";
import { formatCredits } from "@/lib/credits";

function ago(iso: string) {
  const mins = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 60_000));
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

/**
 * Evergreen archive of finished captures. Live streams end, but the clips stay
 * watchable — so a quiet neighbourhood still has something to scroll.
 */
export function RecentCapturesFeed({
  limit = 6,
  title = "Recent captures",
  blurb = "Streams that already wrapped, still watchable any time.",
}: {
  limit?: number;
  title?: string;
  blurb?: string;
}) {
  const [clips, setClips] = useState<ExploreClip[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchExploreClips(limit)
      .then((rows) => {
        if (alive) setClips(rows);
      })
      .catch(() => {
        if (alive) setClips([]);
      });
    return () => {
      alive = false;
    };
  }, [limit]);

  if (!clips || clips.length === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4" aria-label={title}>
      <div className="flex items-center justify-between gap-3">
        <p className="inline-flex items-center gap-2 font-display text-base font-bold text-foreground">
          <Video className="size-4 text-signal" aria-hidden /> {title}
        </p>
        <Link
          to="/explore"
          className="text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-signal"
        >
          See all
        </Link>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{blurb}</p>

      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {clips.map((clip) => (
          <li
            key={clip.id}
            className="overflow-hidden rounded-xl border border-border bg-background/50"
          >
            <div className="aspect-video w-full">
              <LoopingPreview
                videoUrl={clip.videoUrl}
                imageUrl={clip.thumbUrl}
                alt={`Clip from ${clip.title}`}
              />
            </div>
            <div className="p-3">
              <p className="truncate text-sm font-bold text-foreground">{clip.title}</p>
              <p className="mt-1 flex flex-wrap items-center gap-2 text-[0.62rem] text-muted-foreground">
                {clip.place && (
                  <span className="inline-flex min-w-0 items-center gap-1">
                    <MapPin className="size-3" aria-hidden />
                    <span className="truncate">{clip.place}</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="size-3" aria-hidden /> {ago(clip.createdAt)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Eye className="size-3" aria-hidden /> {clip.views}
                </span>
              </p>
              <p className="mt-2 text-[0.62rem] font-extrabold uppercase tracking-[0.08em] text-signal">
                Paid out {formatCredits(clip.bounty)}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
