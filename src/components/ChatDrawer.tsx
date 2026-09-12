import { useState, type ReactNode } from "react";
import { MessageSquare } from "lucide-react";
import { BountyChat } from "@/components/BountyChat";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useIsMobile } from "@/hooks/use-mobile";
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
  const stage = chatStage(status);

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
                  <span className="font-display text-sm font-extrabold text-signal">${bounty}</span>
                  reward
                </p>
              </div>
              <ChatStatusBadge stage={stage} />
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <BountyChat requestKey={requestKey} bare />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
