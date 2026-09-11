import { Share2 } from "lucide-react";
import { useBoosts } from "@/lib/boosts-store";
import { shareBounty } from "@/lib/bounty-share";
import type { LiveRequest } from "@/lib/onlooker";
import { cn } from "@/lib/utils";

export function ShareBountyButton({
  request,
  className,
  label = "Share",
}: {
  request: LiveRequest;
  className?: string;
  label?: string;
}) {
  const { boostOf } = useBoosts();
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void shareBounty(request, boostOf(request.id));
      }}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground transition-colors hover:text-foreground",
        className,
      )}
      aria-label="Share this bounty"
    >
      <Share2 className="size-3.5" /> {label}
    </button>
  );
}
