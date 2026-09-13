import { useState, type ReactNode } from "react";
import { HandCredits, ShieldCheck } from "lucide-react";
import { RequestCard } from "@/components/RequestCard";
import { BoostBounty } from "@/components/BoostBounty";
import { InstantSnippetButton } from "@/components/InstantSnippetButton";
import { isClosed } from "@/lib/onlooker-store";
import { useBoosts } from "@/lib/boosts-store";
import type { LiveRequest, MapPosition } from "@/lib/onlooker";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/**
 * Opens the full bounty details for a feed card and only locks the claim in
 * after the spotter explicitly confirms the commitment warning.
 */
export function BountyDetailsDialog({
  request,
  onClaim,
  children,
  userPosition = null,
  openOnMount = false,
  autoSnap = false,
}: {
  request: LiveRequest;
  onClaim?: (id: string) => void;
  children: ReactNode;
  /** Used to unlock the on-the-spot instant snippet capture. */
  userPosition?: MapPosition | null;
  /** Opens straight away — used when arriving from a nearby-bounty alert link. */
  openOnMount?: boolean;
  /** Arrives from a nearby-bounty push: opens the instant camera right away. */
  autoSnap?: boolean;
}) {
  const [open, setOpen] = useState(openOnMount);
  const [confirming, setConfirming] = useState(false);
  const { boostOf } = useBoosts();
  const done = isClosed(request);
  const claimable = !done && request.status === "open" && !!onClaim;
  const pooled = boostOf(request.id);
  const pool = request.bounty + pooled;

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <div
          role="button"
          tabIndex={0}
          aria-label={`View details for ${request.title}`}
          onClick={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          {children}
        </div>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Bounty details</DialogTitle>
            <DialogDescription>
              Review everything before you commit to capturing this live view.
            </DialogDescription>
          </DialogHeader>

          <RequestCard request={request} />

          {!done && (
            <div className="mt-2 rounded-2xl border border-border bg-surface-raised p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-[0.12em] text-foreground">
                  <HandCredits className="size-3.5 text-signal" />
                  {pooled > 0 ? `Co-funded pool: $${pool}` : `Bounty: $${pool}`}
                </span>
                <BoostBounty requestId={request.id} />
              </div>
              <p className="mt-2 text-[0.7rem] text-muted-foreground">
                Chip in to sweeten this bounty — everything you add goes to whoever films it.
              </p>
            </div>
          )}

          <InstantSnippetButton request={request} userPosition={userPosition} autoStart={autoSnap} />

          <Button
            type="button"
            disabled={!claimable}
            className="mt-2 h-12 w-full rounded-xl font-bold"
            onClick={() => setConfirming(true)}
          >
            <ShieldCheck className="mr-2 size-4" />
            {request.status === "expired"
              ? "Expired"
              : done
                ? "Closed"
                : request.status === "claimed"
                  ? "Already claimed"
                  : "Claim this bounty"}
          </Button>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm your claim</AlertDialogTitle>
            <AlertDialogDescription>
              You are committing to accept this claim. You have less than 2-3 minutes to fully
              commit. If you drop the claim, you will be restricted from claiming this same bounty
              again for the next 2 hours.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                onClaim?.(request.id);
                setConfirming(false);
                setOpen(false);
              }}
            >
              Yes, lock my claim
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
