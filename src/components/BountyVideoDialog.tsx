import { useCallback, useEffect, useState } from "react";
import { BadgeDollarSign, Camera, CheckCircle2, Coins as Credits, Loader2, Play, Share2, Trash2, Video } from "lucide-react";
import { formatCredits } from "@/lib/credits";
import { VideoRecorder } from "@/components/VideoRecorder";
import { blockFileDrop, blockFilePaste, PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";
import { shareBountyVideo } from "@/lib/share";
import { shareClipToSocials } from "@/lib/share-clip";
import { toast } from "sonner";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { isClosed } from "@/lib/onlooker-store";
import { AccessPasscode } from "@/components/AccessPasscode";
import { BountyChat } from "@/components/BountyChat";
import { chatKey } from "@/lib/chat";
import { useAuth } from "@/hooks/use-auth";
import {
  acceptBountyVideo,
  deleteBountyVideo,
  disputeBountyVideo,
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
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [videos, setVideos] = useState<BountyVideo[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [note, setNote] = useState("");
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState("");
  const [justSent, setJustSent] = useState<BountyVideo | null>(null);
  const closed = isClosed(request);

  async function shareClip(video: BountyVideo) {
    setSharingId(video.id);
    setShareLabel("Preparing…");
    try {
      const result = await shareClipToSocials(video, setShareLabel);
      if (result === "downloaded") {
        toast.success("Watermarked clip saved — post it with the copied hashtags.");
      } else {
        toast.success("Shared with Onlooker Live branding.");
      }
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      toast.error(err instanceof Error ? err.message : "Couldn't prepare that clip.");
    } finally {
      setSharingId(null);
      setShareLabel("");
    }
  }

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await listVideosForRequest(request.id, request.dbId ?? null);
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

  /** Only clips filmed inside the app get here — there is no gallery path. */
  async function onCaptured(file: File) {
    setUploading(true);
    try {
      await uploadBountyVideo({ file, request, note });
      setNote("");
      const rows = await listVideosForRequest(request.id, request.dbId ?? null);
      setVideos(rows);
      setThumbs(await thumbnailUrls(rows));
      const mine = rows.find((row) => row.uploader_id === user?.id);
      if (mine) setJustSent(mine);
      toast.success("Live capture sent to this bounty.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Sending that capture failed.");
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
      toast.success(`Accepted. ${Math.round(paid)} Credits sent to the reporter's wallet.`);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't accept that clip.");
    } finally {
      setPayingId(null);
    }
  }

  /** Requester flags a clip; the bounty stays locked until a moderator decides. */
  async function dispute(video: BountyVideo) {
    const reason = window.prompt("What is wrong with this clip?")?.trim();
    if (!reason) return;
    setDisputingId(video.id);
    try {
      await disputeBountyVideo(video.request_id, reason);
      toast.success("Clip disputed. Add evidence in the dispute center.", {
        action: { label: "Open", onClick: () => void navigate({ to: "/disputes" }) },
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't dispute that clip.");
    } finally {
      setDisputingId(null);
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
        <AccessPasscode request={request} />
        <BountyChat requestKey={chatKey(request)} />

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
            <div className="space-y-3" onDrop={blockFileDrop} onDragOver={blockFileDrop} onPaste={blockFilePaste}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note for the requester (optional)"
                className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
              />
              <button
                type="button"
                disabled={uploading || closed}
                onClick={() => setCapturing(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Camera className="size-4" /> {closed ? "Submissions closed" : "Film live video"}
                  </>
                )}
              </button>
              <p className="text-center text-[0.68rem] text-muted-foreground">
                Live camera captures only — gallery videos and screenshots can't be submitted.
                Film the crowd, street, tailgate, or venue surroundings.
              </p>
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-[0.7rem] font-medium leading-snug text-amber-300">
                {PUBLIC_SPACES_DISCLAIMER}
              </p>
              {capturing && !closed && (
                <VideoRecorder
                  onClose={() => setCapturing(false)}
                  onRecorded={(file) => void onCaptured(file)}
                />
              )}
            </div>

            {justSent && (
              <div className="mt-2 rounded-2xl border border-signal/40 bg-surface p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-signal">
                  <CheckCircle2 className="size-4" /> Your live clip is in!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share it with Onlooker Live branding and viral hashtags to bring in more fans.
                </p>
                <button
                  type="button"
                  disabled={sharingId === justSent.id}
                  onClick={() => void shareClip(justSent)}
                  className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-xs font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
                >
                  {sharingId === justSent.id ? (
                    <>
                      <Loader2 className="size-3.5 animate-spin" /> {shareLabel || "Preparing…"}
                    </>
                  ) : (
                    <>
                      <Share2 className="size-3.5" /> Share to TikTok / Instagram Reels
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setJustSent(null)}
                  className="mt-2 text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:underline"
                >
                  Not now
                </button>
              </div>
            )}

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
                        {v.accepted_at && ` · Paid ${Math.round(Number(v.payout_amount))} Credits`}
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
                      <>
                        <button
                          type="button"
                          aria-label="Share to TikTok / Instagram Reels"
                          title="Share to TikTok / Instagram Reels"
                          disabled={sharingId === v.id}
                          onClick={() => void shareClip(v)}
                          className="text-muted-foreground transition-colors hover:text-signal disabled:opacity-50"
                        >
                          {sharingId === v.id ? (
                            <Loader2 className="size-4 animate-spin" />
                          ) : (
                            <Share2 className="size-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label="Delete video"
                          onClick={() => void remove(v)}
                          className="text-muted-foreground transition-colors hover:text-destructive"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </>
                    )}
                  </div>
                  {v.accepted_at ? (
                    <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-surface-raised px-3 py-2 text-xs font-semibold text-signal">
                      <Credits className="size-3.5" /> Accepted ·{" "}
                      {formatCredits(Number(v.payout_amount))} paid to the reporter
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
                            <Credits className="size-3.5" /> Accept &amp; pay{" "}
                            {formatCredits(Number(v.bounty_amount))}
                          </>
                        )}
                      </button>
                    )
                  )}
                  {!v.accepted_at && v.uploader_id !== user.id && (
                    <button
                      type="button"
                      disabled={disputingId === v.id}
                      onClick={() => void dispute(v)}
                      className="mt-2 w-full rounded-xl border border-border px-4 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground transition-colors hover:text-destructive disabled:opacity-50"
                    >
                      {disputingId === v.id ? "Sending…" : "Dispute this clip"}
                    </button>
                  )}
                  {!v.accepted_at && (
                    <Link
                      to="/disputes"
                      className="mt-2 block text-center text-[0.68rem] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Dispute center
                    </Link>
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
