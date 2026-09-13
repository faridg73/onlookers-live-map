import { useState } from "react";
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
  const [busy, setBusy] = useState(false);

  return (
    <ShareDrawer artifact={artifact}>
      <button
        type="button"
        disabled={busy}
        onClick={() => setBusy((v) => v)}
        className={`inline-flex items-center justify-center gap-2 rounded-xl border border-signal/60 bg-signal/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/20 disabled:opacity-60 ${className}`}
      >
        <Share2 className="size-4" />
        {busy ? "Building…" : label}
      </button>
    </ShareDrawer>
  );
}
