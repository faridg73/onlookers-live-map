import { useCallback, useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Play, Share2, Video } from "lucide-react";
import { shareBountyVideo } from "@/lib/share";
import { toast } from "sonner";
import { formatCoins } from "@/lib/coins";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { listMyVideos, playbackUrl, thumbnailUrls, type BountyVideo } from "@/lib/bounty-videos";

export function MyBountyVideos() {
  const { user, loading } = useAuth();
  const [videos, setVideos] = useState<BountyVideo[]>([]);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});

  const refresh = useCallback(async () => {
    try {
      const rows = await listMyVideos();
      setVideos(rows);
      setThumbs(await thumbnailUrls(rows));
    } catch {
      setVideos([]);
      setThumbs({});
    }
  }, []);

  useEffect(() => {
    if (user) void refresh();
    else {
      setVideos([]);
      setThumbs({});
    }
  }, [user, refresh]);

  async function watch(video: BountyVideo) {
    try {
      setPlaying({ id: video.id, url: await playbackUrl(video.storage_path) });
    } catch {
      toast.error("Couldn't open that video.");
    }
  }

  return (
    <section className="mt-8">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg text-foreground">Your bounty videos</h2>
        {user ? (
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground"
          >
            Sign out
          </button>
        ) : null}
      </div>

      {!user ? (
        <div className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center">
          <p className="text-sm text-muted-foreground">
            {loading ? "Checking your account…" : "Sign in to upload and replay bounty videos."}
          </p>
          {!loading && (
            <Link
              to="/auth"
              className="mt-4 inline-flex rounded-full bg-signal px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground"
            >
              Sign in
            </Link>
          )}
        </div>
      ) : videos.length === 0 ? (
        <p className="mt-3 rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          You haven't uploaded a bounty video yet. They stay here for replay any time.
        </p>
      ) : (
        <div className="mt-3 space-y-3">
          {videos.map((v) => (
            <div key={v.id} className="rounded-2xl border border-border bg-surface p-3">
              <div className="flex items-center gap-3">
                {thumbs[v.id] ? (
                  <img
                    src={thumbs[v.id]}
                    alt={`Preview of ${v.request_title || "bounty video"}`}
                    loading="lazy"
                    className="size-14 shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex size-14 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                    <Video className="size-4 text-signal" />
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground">
                    {v.request_title || "Live view capture"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {v.request_place} · {new Date(v.created_at).toLocaleDateString()} ·{" "}
                    {formatCoins(Number(v.bounty_amount))}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void watch(v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-foreground"
                >
                  <Play className="size-3.5" /> Watch
                </button>
                <button
                  type="button"
                  aria-label="Share video"
                  onClick={() => void shareBountyVideo(v)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-signal/50 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal"
                >
                  <Share2 className="size-3.5" /> Share
                </button>
              </div>
              {playing?.id === v.id && (
                <video
                  src={playing.url}
                  controls
                  playsInline
                  autoPlay
                  className="mt-3 w-full rounded-xl bg-black"
                />
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
