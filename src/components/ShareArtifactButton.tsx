import { useState } from "react";
import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { shareArtifact, type ShareArtifact } from "@/lib/share-card";

/** One-tap share of a stylised card with a built-in invite link. */
export function ShareArtifactButton({
  artifact,
  label = "Share card",
  className = "",
}: {
  artifact: ShareArtifact;
  label?: string;
  className?: string;
}) {
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          await shareArtifact(artifact);
        } catch (err) {
          toast.error(err instanceof Error ? err.message : "Couldn't build that share card.");
        } finally {
          setBusy(false);
        }
      }}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-signal/60 bg-signal/10 px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-signal transition-colors hover:bg-signal/20 disabled:opacity-60 ${className}`}
    >
      <Share2 className="size-4" />
      {busy ? "Building…" : label}
    </button>
  );
}
