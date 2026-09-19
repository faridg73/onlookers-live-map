// Copyright (c) 2026 Onlooker LLC. All rights reserved. Proprietary and confidential.
import { Share2 } from "lucide-react";
import { ShareDrawer } from "@/components/ShareDrawer";
import { type ShareArtifact } from "@/lib/share-card";

/** Opens a sharing drawer so people can copy the invite link or share the card image. */
export function ShareArtifactButton({
  artifact,
  label = "Share",
  className = "",
}: {
  artifact: ShareArtifact;
  label?: string;
  className?: string;
}) {
  return (
    <ShareDrawer artifact={artifact}>
      <button
        type="button"
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-signal/60 bg-signal/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/20 disabled:opacity-60 ${className}`}
      >
        <Share2 className="size-4" />
        {label}
      </button>
    </ShareDrawer>
  );
}
