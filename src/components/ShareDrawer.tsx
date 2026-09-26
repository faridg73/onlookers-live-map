// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { useState } from "react";
import { Link, Share2 } from "lucide-react";
import { toast } from "sonner";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { referralLink, shareArtifact, type ShareArtifact } from "@/lib/share-card";

export function ShareDrawer({
  artifact,
  children,
}: {
  artifact: ShareArtifact;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  const copyLink = async () => {
    try {
      const url = await referralLink();
      await navigator.clipboard.writeText(url);
      toast.success("Invite link copied, paste it anywhere.");
      setOpen(false);
    } catch {
      toast.error("Couldn't copy the invite link.");
    }
  };

  const shareCard = async () => {
    setBusy(true);
    try {
      await shareArtifact(artifact);
      setOpen(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't build that share card.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>{children}</DrawerTrigger>
      <DrawerContent className="max-h-[85vh] overflow-y-auto rounded-t-3xl border-border bg-surface px-5 pb-[max(2rem,calc(env(safe-area-inset-bottom)+1rem))]">
        <DrawerHeader className="text-left">
          <DrawerTitle className="font-display text-xl break-words text-foreground">Share this post</DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            Invite people nearby or share the card image.
          </DrawerDescription>
        </DrawerHeader>
        <div className="grid gap-3 px-4 py-2">
          <button
            type="button"
            onClick={copyLink}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-surface-raised px-4 py-3 text-sm font-bold text-foreground transition-colors hover:bg-surface-raised/80"
          >
            <Link className="size-4 text-signal" />
            Copy invite link
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={shareCard}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-signal/60 bg-signal/10 px-4 py-3 text-sm font-bold text-signal transition-colors hover:bg-signal/20 disabled:opacity-60"
          >
            <Share2 className="size-4" />
            {busy ? "Building card…" : "Share card image"}
          </button>
        </div>
        <DrawerFooter>
          <DrawerClose asChild>
            <button
              type="button"
              className="w-full rounded-xl px-4 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:bg-surface-raised"
            >
              Cancel
            </button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
