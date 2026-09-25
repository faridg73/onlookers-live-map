// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useCallback, useEffect, useState } from "react";
import { BadgeDollarSign, Camera, CheckCircle2, CoinsIcon, Loader2, Lock, Play, RotateCcw, Share2, ShieldAlert, Timer, Trash2, Video, X } from "lucide-react";
import { SubmissionSupportLink } from "@/components/SubmissionSupportLink";
import { describeUploadError } from "@/lib/upload-errors";
import { formatCredits } from "@/lib/credits";
import { VideoRecorder } from "@/components/VideoRecorder";
import { blockFileDrop, blockFilePaste, PUBLIC_SPACES_DISCLAIMER } from "@/lib/camera-only";
import { ShareVideoDialog } from "@/components/ShareVideoDialog";
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
import { bountyViewState } from "@/lib/bounty-view-state";
import { AccessPasscode } from "@/components/AccessPasscode";
import { SitePinVerification } from "@/components/SitePinVerification";
import type { SitePinState } from "@/lib/site-pin";

import { BountyChat } from "@/components/BountyChat";
import { chatKey } from "@/lib/chat";
import { useAuth } from "@/hooks/use-auth";
import { notifyPayoutReleased } from "@/lib/payout-emails.functions";
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
import { REPORT_DETAIL_MIN, REPORT_REASONS, reportCapture, type ReportReasonCode } from "@/lib/bounty-report";
import { countdownLabel, getPosterDisputeStats, getReviewWindow, type DisputeStats, type ReviewWindow } from "@/lib/bounty-review";


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
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [lastFile, setLastFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [playing, setPlaying] = useState<{ id: string; url: string } | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const [payingId, setPayingId] = useState<string | null>(null);
  const [disputingId, setDisputingId] = useState<string | null>(null);
  const [disputeVideo, setDisputeVideo] = useState<BountyVideo | null>(null);
  const [disputeReasonCode, setDisputeReasonCode] = useState<ReportReasonCode>("verification_mismatch");
  const [disputeDetails, setDisputeDetails] = useState("");
  const [reviewWindow, setReviewWindow] = useState<ReviewWindow | null>(null);
  const [disputeStats, setDisputeStats] = useState<DisputeStats | null>(null);
  const [nowTick, setNowTick] = useState(() => Date.now());

  const [capturing, setCapturing] = useState(false);
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [shareLabel, setShareLabel] = useState("");
  const [justSent, setJustSent] = useState<BountyVideo | null>(null);
  const [pinState, setPinState] = useState<SitePinState | null>(null);
  /** Real estate bounties stay locked until the on-site PIN handshake passes. */
  const pinLocked = Boolean(pinState?.required) && !pinState?.verifiedByMe && !pinState?.mine;
  const view = bountyViewState(request.status, { pinLocked });
  const closed = view.closed;


  async function shareClip(video: BountyVideo) {
    setSharingId(video.id);
    setShareLabel("Preparing…");
    try {
      const result = await shareClipToSocials(video, setShareLabel);
      if (result === "downloaded") {
        toast.success("Watermarked clip saved, post it with the copied hashtags.");
      } else {
        toast.success("Shared with Onlooker branding.");
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
      setReviewWindow(await getReviewWindow(request.dbId ?? request.id));
    } catch {
      // A signed-out visitor simply sees nothing.
      setVideos([]);
      setThumbs({});
      setReviewWindow(null);
    } finally {
      setLoading(false);
    }
  }, [request.id, request.dbId]);

  useEffect(() => {
    if (open && user) void refresh();
  }, [open, user, refresh]);

  /** Keep the auto-approve countdown honest while the dialog stays open. */
  useEffect(() => {
    if (!open) return;
    const timer = setInterval(() => setNowTick(Date.now()), 30000);
    return () => clearInterval(timer);
  }, [open]);

  /** The poster's own report history, shown as a deterrent before filing. */
  useEffect(() => {
    if (!disputeVideo) return;
    void getPosterDisputeStats().then(setDisputeStats);
  }, [disputeVideo]);

  const autoApproveIn = countdownLabel(reviewWindow?.autoReleaseAt ?? null, nowTick);


  /** Only clips filmed inside the app get here — there is no gallery path. */
  async function onCaptured(file: File) {
    setUploading(true);
    setUploadError(null);
    setLastFile(file);
    setUploadStatus("Starting your submission…");
    try {
      await uploadBountyVideo({ file, request, note, onStatus: setUploadStatus });
      setNote("");
      setLastFile(null);
      const rows = await listVideosForRequest(request.id, request.dbId ?? null);
      setVideos(rows);
      setThumbs(await thumbnailUrls(rows));
      const mine = rows.find((row) => row.uploader_id === user?.id);
      if (mine) setJustSent(mine);
      toast.success("Live capture sent to this bounty.");
    } catch (err) {
      const reason = describeUploadError(err, { bucket: "bounty-videos", sizeBytes: file.size });
      setUploadError(reason);
      toast.error(reason);
    } finally {
      setUploading(false);
      setUploadStatus(null);
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
      toast.success(`Accepted. ${Math.round(paid)} Credits sent to the Onlooker's wallet.`);
      // Let the Onlooker know by email; never block the accept on this.
      void notifyPayoutReleased({ data: { videoId: video.id } }).catch(() => undefined);
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't accept that clip.");
    } finally {
      setPayingId(null);
    }
  }

  /** Poster reports a capture; the money stays held until a moderator decides. */
  async function dispute(video: BountyVideo, reasonCode: ReportReasonCode, reason: string) {
    setDisputingId(video.id);
    try {
      await reportCapture(video.request_id, reasonCode, reason);
      setDisputeVideo(null);
      setReviewWindow((w) => (w ? { ...w, status: "disputed", canDispute: false, autoReleaseAt: null } : w));
      setDisputeDetails("");
      toast.success("Report filed. Add any extra evidence in the dispute center.", {
        action: { label: "Open", onClick: () => void navigate({ to: "/disputes" }) },
      });
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't file that report.");
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
    <>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Bounty videos</DialogTitle>
          <DialogDescription>
            {request.title} · {request.place}
          </DialogDescription>
        </DialogHeader>
        {!closed && <AccessPasscode request={request} />}
        <SitePinVerification requestId={request.dbId ?? null} onState={setPinState} />

        <BountyChat requestKey={chatKey(request)} hideWhenLocked={closed} />

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
            {closed ? (
              <div className="rounded-2xl border border-border bg-surface p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-foreground">
                  <Lock className="size-4 text-muted-foreground" /> {view.closedNotice}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  It&rsquo;s no longer taking new clips. Any submitted videos are listed below.
                </p>
              </div>
            ) : (
            <div className="space-y-3" onDrop={blockFileDrop} onDragOver={blockFileDrop} onPaste={blockFilePaste}>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add a note for the poster (optional)"
                className="w-full resize-none rounded-2xl border border-border bg-surface px-4 py-3 text-sm text-foreground outline-none focus:border-signal"
              />
              <button
                type="button"
                disabled={uploading || closed || pinLocked}
                onClick={() => setCapturing(true)}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-signal px-4 py-3 text-sm font-semibold uppercase tracking-[0.14em] text-signal-foreground disabled:opacity-50"
              >
                {uploading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" /> Sending…
                  </>
                ) : (
                  <>
                    <Camera className="size-4" />{" "}
                    {view.captureLabel}
                  </>
                )}
              </button>

              {uploadStatus && (
                <p className="flex items-center justify-center gap-2 text-xs font-semibold text-foreground">
                  <Loader2 className="size-3.5 animate-spin" /> {uploadStatus}
                </p>
              )}

              {uploadError && (
                <div className="rounded-2xl border border-border bg-surface px-3.5 py-3">
                  <p className="text-xs font-semibold leading-relaxed text-foreground">
                    {uploadError}
                  </p>
                  {lastFile && (
                    <button
                      type="button"
                      disabled={uploading}
                      onClick={() => void onCaptured(lastFile)}
                      className="mt-2.5 inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-1.5 text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-foreground disabled:opacity-50"
                    >
                      <RotateCcw className="size-3.5" /> Retry this clip
                    </button>
                  )}
                </div>
              )}

              <div className="flex justify-center">
                <SubmissionSupportLink />
              </div>


              <p className="text-center text-[0.68rem] text-muted-foreground">
                Live camera captures only, gallery videos and screenshots can't be submitted.
                Film the crowd, street, tailgate, or venue surroundings.
              </p>
              <p className="rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-center text-[0.7rem] font-medium leading-snug text-amber-300">
                {PUBLIC_SPACES_DISCLAIMER}
              </p>
              {capturing && !closed && !pinLocked && (
                <VideoRecorder
                  onClose={() => setCapturing(false)}
                  onRecorded={(file) => void onCaptured(file)}
                />
              )}
            </div>
            )}

            {justSent && (
              <div className="mt-2 rounded-2xl border border-signal/40 bg-surface p-4 text-center">
                <p className="flex items-center justify-center gap-1.5 text-sm font-semibold text-signal">
                  <CheckCircle2 className="size-4" /> Your live clip is in!
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Share it with Onlooker branding and viral hashtags to bring in more fans.
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
                    <ShareVideoDialog video={v}>
                      <button
                        type="button"
                        aria-label="Share video"
                        title="Share video"
                        className="inline-flex items-center gap-1.5 rounded-full border border-signal/60 bg-signal/10 px-3 py-1.5 text-xs font-semibold text-signal"
                      >
                        <Share2 className="size-3.5" /> Share
                      </button>
                    </ShareVideoDialog>
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
                      <CoinsIcon className="size-3.5" /> Accepted ·{" "}
                      {formatCredits(Number(v.payout_amount))} paid to the Onlooker
                    </p>
                  ) : (
                    v.uploader_id !== user.id &&
                    (reviewWindow?.status === "disputed" ? (
                      <p className="mt-3 rounded-xl bg-surface-raised px-3 py-2 text-center text-[0.7rem] font-semibold text-muted-foreground">
                        Reported · a moderator is reviewing this capture. Payment is on hold.
                      </p>
                    ) : (
                      <>
                        {autoApproveIn && (
                          <p className="mt-3 flex items-center justify-center gap-1.5 rounded-xl bg-surface-raised px-3 py-2 text-[0.7rem] font-semibold text-foreground">
                            <Timer className="size-3.5 text-signal" /> Review window · auto-approves in{" "}
                            {autoApproveIn}
                          </p>
                        )}
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
                              <CoinsIcon className="size-3.5" /> Accept &amp; pay{" "}
                              {formatCredits(Number(v.bounty_amount))}
                            </>
                          )}
                        </button>
                      </>
                    )
                  )}

                  {!v.accepted_at && v.uploader_id !== user.id && reviewWindow?.canDispute && (
                    <button
                      type="button"
                      onClick={() => setDisputeVideo(v)}
                      className="mt-2 block w-full text-center text-[0.68rem] text-muted-foreground underline-offset-4 hover:underline"
                    >
                      Something wrong with this capture? Report an issue
                    </button>
                  )}

                  {playing?.id === v.id && (
                    <div className="relative mx-auto mt-3 w-full max-w-xs">
                      <video
                        src={playing.url}
                        controls
                        playsInline
                        autoPlay
                        className="max-h-[38dvh] w-full rounded-xl bg-black object-contain"
                      />
                      <button
                        type="button"
                        aria-label="Close video"
                        onClick={() => setPlaying(null)}
                        className="absolute right-1.5 top-1.5 grid size-11 place-items-center rounded-full border border-border bg-secondary/80 text-foreground shadow-sm transition-colors hover:bg-secondary"
                      >
                        <X className="size-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
    <Dialog open={Boolean(disputeVideo)} onOpenChange={(next) => { if (!next) setDisputeVideo(null); }}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Report this capture</DialogTitle>
          <DialogDescription>
            Reports go to a person for review. Pick the issue and explain it clearly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {REPORT_REASONS.map((reason) => (
            <button
              key={reason.code}
              type="button"
              onClick={() => setDisputeReasonCode(reason.code)}
              className={`w-full rounded-xl border px-3.5 py-3 text-left transition-colors ${
                disputeReasonCode === reason.code
                  ? "border-signal bg-signal/10"
                  : "border-border bg-surface hover:border-signal/50"
              }`}
            >
              <span className="block text-sm font-semibold text-foreground">{reason.label}</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">{reason.hint}</span>
            </button>
          ))}
        </div>

        <label className="space-y-2 text-sm text-foreground">
          <span className="font-semibold">What went wrong?</span>
          <textarea
            value={disputeDetails}
            onChange={(event) => setDisputeDetails(event.target.value)}
            rows={4}
            maxLength={2000}
            placeholder="Be specific: what you asked for, what you got, and the moment in the video where the problem shows."
            className="w-full resize-none rounded-xl border border-border bg-surface px-3 py-3 text-sm text-foreground outline-none focus:border-signal"
          />
        </label>
        <p className="text-[0.7rem] text-muted-foreground">
          {disputeDetails.trim().length < REPORT_DETAIL_MIN
            ? `${REPORT_DETAIL_MIN - disputeDetails.trim().length} more characters needed.`
            : "Thanks, that is enough detail for the review team."}
        </p>

        <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 px-3.5 py-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-300">
            <ShieldAlert className="size-3.5" /> Before you file this
          </p>
          <p className="mt-1.5 text-[0.72rem] leading-relaxed text-amber-200/90">
            Filing a report freezes the Onlooker&rsquo;s payout and sends the bounty to a human
            reviewer. Reports we can&rsquo;t substantiate count against your account standing and can
            limit your posting.
          </p>
          {disputeStats && disputeStats.reviewed > 0 && (
            <p className="mt-2 text-[0.72rem] font-semibold text-amber-200/90">
              Your report rate so far: {disputeStats.rate}% ({disputeStats.disputed} of{" "}
              {disputeStats.reviewed} bounties).
            </p>
          )}
        </div>

        <button
          type="button"
          disabled={
            !disputeVideo ||
            disputeDetails.trim().length < REPORT_DETAIL_MIN ||
            Boolean(disputingId)
          }
          onClick={() => disputeVideo && void dispute(disputeVideo, disputeReasonCode, disputeDetails.trim())}
          className="rounded-xl bg-signal px-4 py-3 text-sm font-semibold text-signal-foreground disabled:opacity-50"
        >
          {disputingId ? "Filing…" : "File this report for review"}
        </button>
        <button
          type="button"
          onClick={() => setDisputeVideo(null)}
          className="text-center text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground underline-offset-4 hover:underline"
        >
          Cancel
        </button>
      </DialogContent>
    </Dialog>

    </>
  );
}
