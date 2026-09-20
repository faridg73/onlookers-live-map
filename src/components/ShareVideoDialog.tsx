// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { Copy, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { SOCIAL_TARGETS, platformShareUrl, BRAND_TAG_TEXT } from "@/lib/social-share";
import { playbackUrl, type BountyVideo } from "@/lib/bounty-videos";
import { cn } from "@/lib/utils";

/**
 * Share one finished clip to any platform. Instagram and TikTok have no web
 * share target, so those copy the caption and open the app instead.
 */
export function ShareVideoDialog({
  video,
  children,
}: {
  video: BountyVideo;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const title = video.request_title || "Onlooker live view";
  const caption = `${title}${video.request_place ? `, ${video.request_place}` : ""} · captured on Onlooker\n${BRAND_TAG_TEXT}`;

  /** Signed link, valid for 7 days so the recipient can still watch. */
  async function link(): Promise<string | null> {
    try {
      return await playbackUrl(video.storage_path, 60 * 60 * 24 * 7);
    } catch {
      toast.error("Couldn't create a share link for that video.");
      return null;
    }
  }

  async function toPlatform(id: (typeof SOCIAL_TARGETS)[number]["id"], captionFirst: boolean, label: string) {
    setBusy(true);
    try {
      const url = await link();
      if (!url) return;
      // Always put the caption + link on the clipboard first, so the share still
      // works when the platform's site is blocked by a browser extension,
      // network policy, or popup blocker.
      let copied = false;
      try {
        await navigator.clipboard.writeText(`${caption}\n${url}`);
        copied = true;
      } catch {
        copied = false;
      }
      const win = window.open(platformShareUrl(id, url, caption), "_blank", "noopener,noreferrer");
      if (!win) {
        toast[copied ? "success" : "error"](
          copied
            ? `${label} couldn't open here — the caption and link are copied, paste them into ${label}.`
            : `${label} couldn't open and the copy failed. Use "Copy link" instead.`,
        );
      } else if (captionFirst) {
        toast[copied ? "success" : "error"](
          copied
            ? `Caption and link copied, paste them into your ${label}.`
            : "Couldn't copy the caption. Copy the link instead.",
        );
      } else if (copied) {
        toast.success(`Opening ${label}. The caption and link are also copied, just in case.`);
      }
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }


  async function copyLink() {
    setBusy(true);
    try {
      const url = await link();
      if (!url) return;
      await navigator.clipboard.writeText(`${caption}\n${url}`);
      toast.success("Link copied, paste it anywhere.");
      setOpen(false);
    } catch {
      toast.error("Couldn't copy that link.");
    } finally {
      setBusy(false);
    }
  }

  async function nativeShare() {
    setBusy(true);
    try {
      const url = await link();
      if (!url) return;
      const nav = typeof navigator === "undefined" ? null : navigator;
      if (nav?.share) {
        try {
          await nav.share({ title, text: caption, url });
          setOpen(false);
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      await navigator.clipboard.writeText(`${caption}\n${url}`);
      toast.success("Link copied, paste it anywhere.");
      setOpen(false);
    } catch {
      toast.error("Couldn't share that video.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-sm overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">Share this clip</DialogTitle>
          <DialogDescription className="break-words">
            {title}
            {video.request_place ? ` · ${video.request_place}` : ""}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {SOCIAL_TARGETS.map((target) => (
            <button
              key={target.id}
              type="button"
              disabled={busy}
              onClick={() => void toPlatform(target.id, target.captionFirst, target.label)}
              className={cn(
                "rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:border-signal disabled:opacity-50",
              )}
            >
              <span className="block text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                {target.label}
              </span>
              <span className="mt-0.5 block text-[0.65rem] leading-snug text-muted-foreground">
                {target.hint}
              </span>
            </button>
          ))}
        </div>

        <div className="mt-1 grid gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void nativeShare()}
            className="flex items-center justify-center gap-2 rounded-xl bg-signal px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-signal-foreground disabled:opacity-50"
          >
            {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Share2 className="size-3.5" />}
            More options
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void copyLink()}
            className="flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.12em] text-foreground disabled:opacity-50"
          >
            <Copy className="size-3.5" /> Copy link
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
