import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { BarChart3, Clock, Eye, Play, Radio, Share2, Video, X } from "lucide-react";
import { ShareVideoDialog } from "@/components/ShareVideoDialog";

import { toast } from "sonner";
import { formatCredits } from "@/lib/credits";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/use-auth";
import {
  deleteBountyVideo,
  listMyVideos,
  playbackUrl,
  thumbnailUrls,
  type BountyVideo,
} from "@/lib/bounty-videos";

function formatDuration(seconds: number | null) {
  if (!seconds) return "0:00";
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

export function MyBountyVideos() {
  const { user, loading } = useAuth();
  const [videos, setVideos] = useState<BountyVideo[]>([]);
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [deleting, setDeleting] = useState<string | null>(null);
  const [playFailed, setPlayFailed] = useState<string | null>(null);

  const stats = useMemo(() => {
    const totalViews = videos.reduce((sum, video) => sum + Number(video.view_count ?? 0), 0);
    const earned = videos.reduce(
      (sum, video) => sum + Number(video.payout_amount || video.bounty_amount || 0),
      0,
    );
    const seconds = videos.reduce((sum, video) => sum + Number(video.duration_seconds ?? 0), 0);
    return { totalViews, earned, seconds };
  }, [videos]);

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
      setPlayFailed(null);
      setPlaying({ id: video.id, url: await playbackUrl(video.storage_path) });
    } catch {
      toast.error("Couldn't open that video.");
    }
  }

  async function remove(video: BountyVideo) {
    setDeleting(video.id);
    try {
      await deleteBountyVideo(video);
      setVideos((prev) => prev.filter((row) => row.id !== video.id));
      setPlaying((current) => (current?.id === video.id ? null : current));
      toast.success("Stream removed from your history.");
    } catch {
      toast.error("Couldn't delete that stream. Try again.");
    } finally {
      setDeleting(null);
    }
  }

  return (
    <section className="mt-6 rounded-3xl border border-border bg-surface-raised p-3 sm:p-4 lg:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.18em] text-muted-foreground">
            Creator profile hub
          </p>
          <h2 className="mt-1 font-display text-xl text-foreground">Stream history & analytics</h2>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-signal/40 bg-signal/10 px-3 py-1 text-xs font-semibold text-signal">
          <Radio className="size-3.5" /> {videos.length} broadcast{videos.length === 1 ? "" : "s"}
        </span>
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
      ) : (
        <Tabs defaultValue="history" className="mt-4">
          <TabsList className="w-full">
            <TabsTrigger value="history" className="flex-1 text-xs sm:text-sm">
              Stream history
            </TabsTrigger>
            <TabsTrigger value="analytics" className="flex-1 text-xs sm:text-sm">
              Analytics
            </TabsTrigger>
          </TabsList>

          <TabsContent value="history" className="mt-4">
            {videos.length === 0 ? (
              <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                You haven't posted a video yet. Finished broadcasts and flash bounty captures will appear here.
              </p>
            ) : (
              <div className="space-y-3">
                {videos.map((v) => (
                  <div key={v.id} className="relative rounded-2xl border border-border bg-surface p-3 pr-11">
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <button
                          type="button"
                          aria-label="Delete stream"
                          disabled={deleting === v.id}
                          className="absolute right-2 top-2 flex size-8 items-center justify-center rounded-full border border-border bg-surface-raised text-muted-foreground transition-colors hover:border-destructive/60 hover:text-destructive disabled:opacity-50"
                        >
                          <X className="size-4" />
                        </button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete this stream?</AlertDialogTitle>
                          <AlertDialogDescription>
                            “{v.request_title || "Live broadcast"}” will be removed from your
                            profile history permanently. This can't be undone.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Keep it</AlertDialogCancel>
                          <AlertDialogAction onClick={() => void remove(v)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                    <div className="flex flex-col gap-3 min-[460px]:flex-row min-[460px]:items-center">
                      {thumbs[v.id] ? (
                        <img
                          src={thumbs[v.id]}
                          alt={`Preview of ${v.request_title || "stream"}`}
                          loading="lazy"
                          className="size-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex size-16 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                          <Video className="size-4 text-signal" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {v.request_title || "Live broadcast"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {v.request_place} · {new Date(v.created_at).toLocaleDateString()} · {formatDuration(v.duration_seconds)}
                        </p>
                        <p className="mt-1 flex flex-wrap gap-2 text-[0.65rem] text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Eye className="size-3" /> {Number(v.view_count ?? 0)} views
                          </span>
                          <span>{formatCredits(Number(v.payout_amount || v.bounty_amount || 0))} earned</span>
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void watch(v)}
                          className="rounded-full text-xs font-semibold"
                        >
                          <Play className="size-3.5" /> Watch
                        </Button>
                        <ShareVideoDialog video={v}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            aria-label="Share video"
                            className="rounded-full border-signal/60 bg-signal/10 text-xs font-semibold text-signal"
                          >
                            <Share2 className="size-3.5" /> Share
                          </Button>
                        </ShareVideoDialog>
                      </div>
                    </div>
                    {playing?.id === v.id && (
                      <div className="relative mx-auto mt-3 w-full max-w-xs">
                        <video
                          src={playing.url}
                          controls
                          playsInline
                          autoPlay
                          preload="metadata"
                          onError={() => setPlayFailed(v.id)}
                          onLoadedData={() =>
                            setPlayFailed((current) => (current === v.id ? null : current))
                          }
                          className="max-h-[38dvh] w-full rounded-xl bg-black object-contain"
                        />
                        {playFailed === v.id && (
                          <div className="mt-2 rounded-xl border border-border bg-surface-raised p-3 text-center text-xs text-muted-foreground">
                            <p>This clip won't play in this browser.</p>
                            <a
                              href={playing.url}
                              target="_blank"
                              rel="noreferrer"
                              download
                              className="mt-2 inline-flex rounded-full bg-signal px-4 py-1.5 text-[0.7rem] font-semibold text-signal-foreground"
                            >
                              Open or download
                            </a>
                          </div>
                        )}
                        <button
                          type="button"
                          aria-label="Close video"
                          onClick={() => setPlaying(null)}
                          className="absolute right-1.5 top-1.5 flex size-8 items-center justify-center rounded-full bg-black/75 text-signal transition-colors hover:bg-black"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="analytics" className="mt-4">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { icon: Video, label: "Past broadcasts", value: videos.length.toLocaleString() },
                { icon: Eye, label: "Total viewers", value: stats.totalViews.toLocaleString() },
                { icon: BarChart3, label: "Flash bounties", value: formatCredits(stats.earned) },
                { icon: Clock, label: "Minutes streamed", value: Math.ceil(stats.seconds / 60).toLocaleString() },
              ].map(({ icon: Icon, label, value }) => (
                <article key={label} className="rounded-2xl border border-border bg-surface p-3">
                  <Icon className="size-4 text-signal" aria-hidden />
                  <p className="mt-2 break-words font-display text-xl text-foreground">{value}</p>
                  <p className="mt-1 text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground">
                    {label}
                  </p>
                </article>
              ))}
            </div>
            <div className="mt-3 rounded-2xl border border-border bg-surface p-3">
              <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                Recent performance
              </p>
              <div className="mt-3 space-y-2">
                {videos.slice(0, 5).map((video) => (
                  <div
                    key={video.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-3 rounded-xl bg-surface-raised px-3 py-2 text-xs"
                  >
                    <span className="truncate text-foreground">{video.request_title || "Live broadcast"}</span>
                    <span className="inline-flex items-center gap-1 text-muted-foreground">
                      <Eye className="size-3" /> {Number(video.view_count ?? 0)}
                    </span>
                    <span className="font-semibold text-signal">
                      {formatCredits(Number(video.payout_amount || video.bounty_amount || 0))}
                    </span>
                  </div>
                ))}
                {videos.length === 0 && (
                  <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground">
                    Analytics start after your first saved stream.
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      )}
    </section>
  );
}
