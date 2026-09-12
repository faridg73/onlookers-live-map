import { useCallback, useEffect, useState, type ReactNode } from "react";
import { BadgeCheck, Loader2, MessageSquare, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { BountyChat } from "@/components/BountyChat";
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
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
import { approveAndPay, fetchChatReview, requestRevision, type ChatReview } from "@/lib/chat-review";
import { cn } from "@/lib/utils";

export type ChatStage = "active" | "review" | "complete";

/** Turns a bounty status into the wording shown in the sticky chat header. */
export function chatStage(status: string): ChatStage {
  if (status === "fulfilled") return "review";
  if (status === "completed" || status === "expired") return "complete";
  return "active";
}

const STAGE_TEXT: Record<ChatStage, string> = {
  active: "Active chat",
  review: "Video under review",
  complete: "Bounty completed",
};

export function ChatStatusBadge({ stage, className }: { stage: ChatStage; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.6rem] font-extrabold uppercase tracking-[0.12em]",
        stage === "active" && "bg-signal text-signal-foreground",
        stage === "review" && "border border-border bg-surface-raised text-live",
        stage === "complete" && "border border-border bg-surface-raised text-muted-foreground",
        className,
      )}
    >
      {stage === "active" && <span className="size-1.5 rounded-full bg-signal-foreground" />}
      {STAGE_TEXT[stage]}
    </span>
  );
}

/**
 * The bounty conversation as a sliding panel — up from the bottom on phones and
 * in from the right on desktop — so the map stays visible behind it.
 */
export function ChatDrawer({
  requestKey,
  title,
  bounty,
  status,
  children,
  open: openProp,
  onOpenChange,
}: {
  requestKey: string;
  title: string;
  bounty: number;
  status: string;
  /** Optional trigger; omit when controlling the panel from outside. */
  children?: ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const isMobile = useIsMobile();
  const [selfOpen, setSelfOpen] = useState(false);
  const open = openProp ?? selfOpen;
  const setOpen = onOpenChange ?? setSelfOpen;
  const [review, setReview] = useState<ChatReview | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [working, setWorking] = useState(false);

  const refresh = useCallback(() => {
    fetchChatReview(requestKey)
      .then(setReview)
      .catch(() => setReview(null));
  }, [requestKey]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  const closed = review?.closed ?? false;
  const stage: ChatStage = closed ? "complete" : chatStage(status);
  const reward = review?.bounty || bounty;
  const canReview = Boolean(review?.isRequester && review?.videoId) && !closed;

  async function approve() {
    if (!review?.videoId || working) return;
    setWorking(true);
    try {
      const paid = await approveAndPay(review.videoId, requestKey);
      toast.success(`Approved — $${paid.toFixed(2)} released to the hunter.`);
      setConfirming(false);
      refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not approve this video.");
    } finally {
      setWorking(false);
    }
  }

  async function revise() {
    if (working) return;
    setWorking(true);
    try {
      await requestRevision(
        requestKey,
        "The requester asked for a revision. Please send another take of this bounty.",
      );
      toast.success("Revision requested in the chat.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not request a revision.");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      {children && (
        <div
          role="button"
          tabIndex={0}
          aria-label={`Open chat for ${title}`}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              setOpen(true);
            }
          }}
        >
          {children}
        </div>
      )}

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          onClick={(event) => event.stopPropagation()}
          className={cn(
            "flex flex-col gap-0 border-border bg-surface p-0",
            isMobile
              ? "h-[85dvh] rounded-t-3xl"
              : "h-full w-full !max-w-md sm:!max-w-md",
          )}
        >
          <div className="sticky top-0 z-10 shrink-0 border-b border-border bg-surface/95 px-4 pb-3 pt-4 backdrop-blur-xl">
            {isMobile && (
              <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" aria-hidden />
            )}
            <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 pr-6">
              <div className="min-w-0">
                <SheetTitle className="truncate font-display text-base font-extrabold tracking-tight text-foreground">
                  {title}
                </SheetTitle>
                <p className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                  <MessageSquare className="size-3.5 text-signal" />
                <span className="font-display text-sm font-extrabold text-signal">${reward}</span>
                  reward
                </p>
              </div>
              <ChatStatusBadge stage={stage} />
            </div>

            {canReview && (
              <div className="mt-3 rounded-2xl border border-signal/40 bg-surface-raised p-3">
                <p className="text-xs font-semibold text-foreground">
                  A video is waiting on your review.
                </p>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={revise}
                    disabled={working}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full border border-border px-3 py-2 text-xs font-bold text-foreground disabled:opacity-50"
                  >
                    <RotateCcw className="size-3.5" /> Request Revision
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirming(true)}
                    disabled={working}
                    className="inline-flex items-center justify-center gap-1.5 rounded-full bg-signal px-3 py-2 text-xs font-extrabold text-signal-foreground disabled:opacity-50"
                  >
                    {working ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <BadgeCheck className="size-3.5" />
                    )}
                    Approve &amp; Pay
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <BountyChat requestKey={requestKey} bare readOnly={closed} />
          </div>

          <AlertDialog open={confirming} onOpenChange={setConfirming}>
            <AlertDialogContent className="border-border bg-surface">
              <AlertDialogHeader>
                <AlertDialogTitle className="font-display text-foreground">
                  Approve this video?
                </AlertDialogTitle>
                <AlertDialogDescription className="text-muted-foreground">
                  Are you sure you want to approve this video? This will instantly release $
                  {reward} to the Bounty Hunter.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(event) => {
                    event.preventDefault();
                    void approve();
                  }}
                  disabled={working}
                  className="bg-signal text-signal-foreground hover:bg-signal/90"
                >
                  {working ? "Releasing…" : "Approve & Pay"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </SheetContent>
      </Sheet>
    </>
  );
}
