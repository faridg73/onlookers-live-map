import { useCallback, useEffect, useRef, useState } from "react";
import { BadgeDollarSign, Loader2, Play, Share2, Trash2, Upload, Video } from "lucide-react";
import { shareBountyVideo } from "@/lib/share";
import { toast } from "sonner";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useAuth } from "@/hooks/use-auth";
import {
  acceptBountyVideo,
  deleteBountyVideo,
  listVideosForRequest,
  playbackUrl,
  thumbnailUrls,
  uploadBountyVideo,
  type BountyVideo,
} from "@/lib/bounty-videos";
import type { LiveRequest } from "@/lib/onlooker";

export function BountyVideoDialog({
  request,
  children,
}: {
  request: LiveRequest;
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<BountyVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listVideosForRequest(request.id);
      setVideos(rows);
      setThumbs(await thumbnailUrls(rows));
    } catch {
      // A signed-out visitor simply sees nothing.
      setVideos([]);
      setThumbs({});
    } finally {
      setLoading(false);
    }
  }, [request.id]);

  useEffect(() => {
    if (open && user) void refresh();
  }, [open, user, refresh]);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      await uploadBountyVideo({ file, request, note });
      setNote("");
      toast.success("Video uploaded and saved to this bounty.");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function watch(video: BountyVideo) {
    try {
      setPlaying({ id: video.id, url: await playbackUrl(video.storage_path) });
    } catch {
      toast.error("Couldn't open that video.");
    }
  }

  async function accept(video: BountyVideo) {
    setPayingId(video.id);
    try {
      const paid = await acceptBountyVideo(video.id);
      toast.success(`Accepted. $${paid.toFixed(2)} sent to the reporter's wallet.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't accept that clip.");
    } finally {
      setPayingId(null);
    }
  }

  async function remove(video: BountyVideo) {
    try {
      await deleteBountyVideo(video);
      toast.success("Video removed.");
      await refresh();
    } catch {
      toast.error("Couldn't remove that video.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Bounty videos</DialogTitle>
          <DialogDescription>
            {request.title} · {request.place}
          </DialogDescription>
        </DialogHeader>

        {!user ? (
          <div className="rounded-2xl border border-border bg-surface p-5 text-center">
            <p className="text-sm text-muted-foreground">
              Sign in to record a video for this bounty or watch past ones.
            </p>
            <Link
              to="/auth"
              className="mt-4 inline-flex rounded-full bg-signal px-5 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground"
            >
              Sign in
            </Link>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note for the requester (optional)"
                className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
              />
              <input
                ref={inputRef}
                type="file"
                accept="video/*"
                capture="environment"
                onChange={onFile}
                className="hidden"
              />
              <button
                type="button"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Uploading…
                  </>
                ) : (
                  <>
                    <Upload className="size-4" /> Record or upload video
                  </>
                )}
              </button>
            </div>

            <div className="mt-2 space-y-3">
              {loading && (
                <p className="text-center text-sm text-muted-foreground">Loading videos…</p>
              )}
              {!loading && videos.length === 0 && (
                <p className="rounded-2xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                  No videos for this bounty yet.
                </p>
              )}
              {videos.map((v) => (
                <div key={v.id} className="rounded-2xl border border-border bg-surface p-3">
                  <div className="flex items-center gap-3">
                    {thumbs[v.id] ? (
                      <img
                        src={thumbs[v.id]}
                        alt={`Preview of ${v.note || "bounty video"}`}
                        loading="lazy"
                        className="size-12 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-surface-raised">
                        <Video className="size-4 text-signal" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">
                        {v.note || "Live view capture"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(v.created_at).toLocaleString()}
                        {v.accepted_at && ` · Paid $${Number(v.payout_amount).toFixed(2)}`}
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
                      className="text-muted-foreground transition-colors hover:text-signal"
                    >
                      <Share2 className="size-4" />
                    </button>
                    {v.uploader_id === user.id && (
                      <button
                        type="button"
                        aria-label="Delete video"
                        onClick={() => void remove(v)}
                        className="text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    )}
                  </div>
                  {v.accepted_at ? (
                    <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-surface-raised px-3 py-2 text-xs font-semibold text-signal">
                      <BadgeDollarSign className="size-3.5" /> Accepted · $
                      {Number(v.payout_amount).toFixed(2)} paid to the reporter
                    </p>
                  ) : (
                    v.uploader_id !== user.id && (
                      <button
                        type="button"
                        disabled={payingId === v.id}
                        onClick={() => void accept(v)}
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
                      >
                        {payingId === v.id ? (
                          <>
                            <Loader2 className="size-3.5 animate-spin" /> Paying…
                          </>
                        ) : (
                          <>
                            <BadgeDollarSign className="size-3.5" /> Accept & pay $
                            {Number(v.bounty_amount).toFixed(2)}
                          </>
                        )}
                      </button>
                    )
                  )}
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
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
